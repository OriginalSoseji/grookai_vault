import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = (
    ROOT
    / "docs"
    / "audits"
    / "special_variant_printing_self_hosted_evidence_v1"
    / "POKEJAVI_SPECIAL_VARIANT_REVIEW_INSTRUCTIONS_V1.pdf"
)
DELIVERY_COPY = ROOT / "output" / "pdf" / OUTPUT.name

BLUE = colors.HexColor("#2563EB")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#CBD5E1")
PALE_BLUE = colors.HexColor("#EFF6FF")
PALE_AMBER = colors.HexColor("#FFFBEB")
AMBER = colors.HexColor("#B45309")


def page_chrome(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(0.65 * inch, height - 0.42 * inch, "GROOKAI VAULT - PRIVATE REVIEW")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 0.65 * inch, height - 0.42 * inch, "Special Variant Printing Review V1")
    canvas.setStrokeColor(LINE)
    canvas.line(0.65 * inch, height - 0.5 * inch, width - 0.65 * inch, height - 0.5 * inch)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.65 * inch, 0.38 * inch, "Private reviewer instructions - no direct database writes")
    canvas.drawRightString(width - 0.65 * inch, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.62 * inch,
        bottomMargin=0.56 * inch,
        title="PokeJavi Special Variant Review Instructions V1",
        author="Grookai Vault",
        subject="Private exact-printing image review instructions",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates(PageTemplate(id="instructions", frames=[frame], onPage=page_chrome))

    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=24,
        textColor=INK,
        alignment=TA_CENTER,
        spaceAfter=5,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    heading = ParagraphStyle(
        "Heading",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=14,
        textColor=INK,
        spaceBefore=5,
        spaceAfter=5,
    )
    body = ParagraphStyle(
        "Body",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12,
        textColor=INK,
        spaceAfter=4,
    )
    small = ParagraphStyle(
        "Small",
        parent=body,
        fontSize=8.1,
        leading=10.5,
        textColor=MUTED,
    )
    step_number = ParagraphStyle(
        "StepNumber",
        parent=body,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=TA_CENTER,
        leading=18,
    )
    step_text = ParagraphStyle("StepText", parent=body, spaceAfter=0)

    story = [
        Spacer(1, 0.06 * inch),
        Paragraph("Special Variant Image Review", title),
        Paragraph(
            "Your job is to confirm what the self-hosted card image actually proves. Your review is a draft and never changes Grookai's database by itself.",
            subtitle,
        ),
    ]

    callout = Table(
        [[Paragraph("Open after deployment", small), Paragraph("https://grookaivault.com/review/special-variants", body)]],
        colWidths=[1.45 * inch, 5.0 * inch],
        hAlign="CENTER",
    )
    callout.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.8, BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([callout, Spacer(1, 0.07 * inch), Paragraph("Login", heading)])
    story.append(Paragraph(
        "1. Open the link above. 2. Sign in with your normal Grookai account. 3. You should see the private Special variant printings review page. If you see Not Found after signing in, stop and report it.",
        body,
    ))

    story.append(Paragraph("Review each card", heading))
    steps = [
        ("1", "Click the card image or <b>View full evidence</b> to inspect the full self-hosted image at a larger size."),
        ("2", "Confirm the card name and number. Then inspect the visible stamp, logo, border, print marker, and expected finish."),
        ("3", "Choose one decision from the menu. Use <b>Exact card and variant</b> only when the image visibly proves the expected printing."),
        ("4", "Add an evidence note when a mark is difficult to see, the image is low resolution, or the selected decision needs an explanation."),
        ("5", "Continue with <b>Next unreviewed</b>. Filters can show unreviewed rows, flagged images, or a specific card."),
    ]
    step_rows = []
    for number, text in steps:
        number_box = Table([[Paragraph(number, step_number)]], colWidths=[0.34 * inch], rowHeights=[0.34 * inch])
        number_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BLUE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        step_rows.append([number_box, Paragraph(text, step_text)])
    step_table = Table(step_rows, colWidths=[0.48 * inch, 5.97 * inch], rowHeights=None)
    step_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(step_table)

    story.append(Paragraph("Decision guide", heading))
    decisions = [
        ["Exact card and variant", "Name, number, marker, and finish all match what is expected."],
        ["Needs more evidence", "The image is plausible, but the exact marker or finish cannot be proved."],
        ["Wrong card identity", "The visible card name or number is not the expected card."],
        ["Wrong variant marker", "The card is correct, but the stamp, logo, border, or special mark is wrong or missing."],
        ["Wrong finish", "The image does not support the expected holo, reverse, or normal finish."],
        ["Image unusable", "The image is too small, cropped, obscured, or otherwise unusable for review."],
    ]
    decision_table = Table(
        [[Paragraph(f"<b>{label}</b>", small), Paragraph(description, small)] for label, description in decisions],
        colWidths=[1.75 * inch, 4.7 * inch],
        repeatRows=0,
    )
    decision_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(decision_table)

    story.extend([Spacer(1, 0.05 * inch), Paragraph("Save and export", heading)])
    story.append(Paragraph(
        "Your decisions save only in this browser on this device. Do not clear browser/site data before exporting. Export a JSON backup periodically and again when you finish. Send the exported JSON file to Cesar; do not edit it by hand.",
        body,
    ))

    warning = Table([[Paragraph(
        "Important: Your review does not approve a card, publish it, change pricing, or write to the database. Founder confirmation and later bounded system gates are separate.",
        body,
    )]], colWidths=[6.45 * inch])
    warning.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_AMBER),
        ("BOX", (0, 0), (-1, -1), 0.8, AMBER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([Spacer(1, 0.03 * inch), KeepTogether(warning)])

    doc.build(story)
    DELIVERY_COPY.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(OUTPUT, DELIVERY_COPY)
    print(OUTPUT)
    print(DELIVERY_COPY)


if __name__ == "__main__":
    build_pdf()
