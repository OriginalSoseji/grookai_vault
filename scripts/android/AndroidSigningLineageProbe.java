import com.android.apksig.ApkVerifier;
import com.android.apksig.SigningCertificateLineage;

import java.io.File;
import java.security.MessageDigest;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

public final class AndroidSigningLineageProbe {
    private static String sha256(X509Certificate certificate) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded());
        return HexFormat.of().formatHex(digest);
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: AndroidSigningLineageProbe <apk>");
            System.exit(2);
        }

        ApkVerifier.Result result = new ApkVerifier.Builder(new File(args[0])).build().verify();
        if (!result.isVerified()) {
            System.err.println("APK signature verification failed: " + result.getErrors());
            System.exit(3);
        }

        SigningCertificateLineage lineage = result.getSigningCertificateLineage();
        List<String> entries = new ArrayList<>();
        if (lineage != null) {
            for (X509Certificate certificate : lineage.getCertificatesInLineage()) {
                SigningCertificateLineage.SignerCapabilities capabilities = lineage.getSignerCapabilities(certificate);
                entries.add("{\"sha256\":\"" + sha256(certificate)
                        + "\",\"installedData\":"
                        + (capabilities != null && capabilities.hasInstalledData()) + "}");
            }
        }

        List<X509Certificate> signers = result.getSignerCertificates();
        if (signers.size() != 1) {
            System.err.println("Expected exactly one current APK signer; found " + signers.size());
            System.exit(4);
        }

        System.out.println("{\"verified\":true,\"signerSha256\":\"" + sha256(signers.get(0))
                + "\",\"lineage\":[" + String.join(",", entries) + "]}");
    }
}
