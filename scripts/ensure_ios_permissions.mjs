import fs from "fs";

const path = "ios/Runner/Info.plist";

let content = fs.readFileSync(path, "utf8");

function insertIfMissing(key, value) {
  if (!content.includes(`<key>${key}</key>`)) {
    content = content.replace(
      "</dict>",
`  <key>${key}</key>
  <string>${value}</string>
</dict>`
    );
  }
}

insertIfMissing(
  "NSPhotoLibraryUsageDescription",
  "Grookai Vault uses your photo library so you can select card images to add to your vault."
);

insertIfMissing(
  "NSCameraUsageDescription",
  "Grookai Vault uses the camera so you can scan and capture trading cards."
);

insertIfMissing(
  "NSPhotoLibraryAddUsageDescription",
  "Grookai Vault saves card images to your photo library when you choose to export them."
);

fs.writeFileSync(path, content);
console.log("iOS Info.plist permissions ensured.");
