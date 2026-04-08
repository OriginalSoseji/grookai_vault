import fs from "fs";

const path = "ios/Runner/Info.plist";
let content = fs.readFileSync(path, "utf8");

const permissions = [
  [
    "NSPhotoLibraryUsageDescription",
    "Grookai Vault uses your photo library so you can select card images to add to your vault.",
  ],
  [
    "NSCameraUsageDescription",
    "Grookai Vault uses the camera so you can scan and capture trading cards.",
  ],
  [
    "NSPhotoLibraryAddUsageDescription",
    "Grookai Vault saves card images to your photo library when you choose to export them.",
  ],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureKey(key, value) {
  const blockPattern = new RegExp(
    `<key>${escapeRegExp(key)}</key>\\s*<string>[\\s\\S]*?<\\/string>`,
  );

  if (blockPattern.test(content)) {
    content = content.replace(
      blockPattern,
      `\t<key>${key}</key>\n\t<string>${value}</string>`,
    );
    return;
  }

  content = content.replace(
    "</dict>",
    `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`,
  );
}

for (const [key, value] of permissions) {
  ensureKey(key, value);
}

fs.writeFileSync(path, content);
console.log("iOS permissions updated.");
