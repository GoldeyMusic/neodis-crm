#!/usr/bin/env python3
"""
generate_rapport_pdf.py — Génère le rapport d'impact post-formation NEODIS / UMANI Town
Usage : python3 generate_rapport_pdf.py <input_json> <output_pdf>
"""

import sys, json
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import Flowable
from datetime import datetime

# ── COULEURS ────────────────────────────────────────────────────────────────
# Objets HexColor pour ReportLab
C_DARK    = HexColor('#1A1A2E')
C_GREEN   = HexColor('#16A34A')
C_ORANGE  = HexColor('#D97706')
C_PURPLE  = HexColor('#7C3AED')
C_BLUE    = HexColor('#2563EB')
C_GRAY    = HexColor('#6B7280')
C_LIGHT   = HexColor('#F8F8F8')
C_BORDER  = HexColor('#E5E7EB')
C_TEXT    = HexColor('#374151')
C_MUTED   = HexColor('#9CA3AF')

# Chaînes hex pour le markup Paragraph (sans le #)
HX_DARK   = '1A1A2E'
HX_GREEN  = '16A34A'
HX_ORANGE = 'D97706'
HX_PURPLE = '7C3AED'
HX_BLUE   = '2563EB'
HX_GRAY   = '6B7280'
HX_MUTED  = '9CA3AF'

CAT_COLORS = {
    'technique':     HexColor('#7C3AED'),
    'confiance':     HexColor('#D97706'),
    'professionnel': HexColor('#16A34A'),
    'reseau':        HexColor('#2563EB'),
}
CAT_LABELS = {
    'technique':     'Technique & Outils',
    'confiance':     'Confiance & Mindset',
    'professionnel': 'Activité Professionnelle',
    'reseau':        'Réseau & Communauté',
}
CAT_ICONS = {
    'technique': '🎛', 'confiance': '💪', 'professionnel': '🎤', 'reseau': '🤝',
}

STATUT_LABELS = {
    'activite':       'En activité',
    'recherche':      'En recherche',
    'sans_nouvelles': 'Sans nouvelles',
    '':               'Non contacté',
}
STATUT_COLORS = {
    'activite':       HexColor('#16A34A'),
    'recherche':      HexColor('#D97706'),
    'sans_nouvelles': C_GRAY,
    '':               C_MUTED,
}
STATUT_HEX = {
    'activite':       HX_GREEN,
    'recherche':      HX_ORANGE,
    'sans_nouvelles': HX_GRAY,
    '':               HX_MUTED,
}

# ── MOTS-CLÉS CATÉGORISATION ─────────────────────────────────────────────────
CAT_KEYWORDS = {
    'technique':     ['mao', 'logic', 'logiciel', 'production', 'séquenc', 'outil',
                      'suno', 'spotify', 'platform', 'intelligence artificielle',
                      'mixage', 'enregistr', 'numérique', 'ableton', 'studio',
                      'masterclass', ' ia ', 'daw'],
    'confiance':     ['confianc', 'autonomi', 'déclic', 'oser', 'cap ', 'assumer',
                      'rassur', 'motivant', "état d'esprit", 'disciplin', 'certaine',
                      'tournant', 'capaci'],
    'professionnel': ['concert', 'single', 'sortie', 'streaming', 'youtube',
                      'stratégi', 'calendrier', 'carrièr', 'live', 'professionnel',
                      'chorus', 'édition', 'marketing', 'réseaux sociaux',
                      'distribut', 'scène', 'composi', 'titre', 'release'],
    'reseau':        ['lien', 'contact', 'martiniquais', 'paysage', 'socioculturel',
                      'réseau', 'ultra-marin', 'outre-mer', 'région', 'considér',
                      'communauté'],
}

PROOF_PATTERNS = [
    ('Concert / Scène',       ['premier concert', 'concert guitare', 'donné', 'scène']),
    ('MAO en live',           ['logic en live', 'utilisé logic', 'mao', 'séquence']),
    ('Production musicale',   ['composé', 'réalisé', 'premier titre', 'finalise']),
    ('Sorties planifiées',    ['sortie', 'single', 'stratégie de singles']),
    ('Stratégie digitale',    ['youtube', 'identité visuelle', 'réseaux sociaux']),
    ('Plan carrière 2026',    ['2026', 'calendrier', 'objectifs']),
]

def categorize(verbatim):
    if not verbatim:
        return {}
    sentences = [s.strip() for s in verbatim.replace('\n', '. ').split('.') if len(s.strip()) > 15]
    result = {cat: [] for cat in CAT_KEYWORDS}
    for s in sentences:
        low = s.lower()
        for cat, kws in CAT_KEYWORDS.items():
            if any(k in low for k in kws):
                result[cat].append(s)
                break
    return {k: v for k, v in result.items() if v}

def extract_proofs(verbatim):
    if not verbatim:
        return []
    sentences = [s.strip() for s in verbatim.replace('\n', '. ').split('.') if s.strip()]
    found = []
    seen = set()
    for label, kws in PROOF_PATTERNS:
        for s in sentences:
            low = s.lower()
            if any(k in low for k in kws) and label not in seen:
                found.append((label, s))
                seen.add(label)
                break
    return found

def compute_score(entry):
    score = 0
    v = entry.get('verbatim', '')
    if v and v.strip():
        score += 25
    statut = entry.get('statut', '')
    if statut == 'activite':   score += 30
    elif statut == 'recherche': score += 15
    proofs = extract_proofs(v)
    score += min(len(proofs) * 10, 20)
    cats = categorize(v)
    score += min(len(cats) * 3, 12)
    score += min(entry.get('releases', 0) * 5, 10)
    score += min(entry.get('contrats', 0) * 10, 10)
    return min(score, 100)

def score_color(s):
    if s >= 70: return C_GREEN
    if s >= 40: return C_ORANGE
    return C_GRAY

# ── FLOWABLES CUSTOM ─────────────────────────────────────────────────────────
class ColoredRect(Flowable):
    """Rectangle coloré de fond."""
    def __init__(self, width, height, color, radius=4):
        super().__init__()
        self.width  = width
        self.height = height
        self.color  = color
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=0)

class ScoreBar(Flowable):
    """Barre de progression colorée."""
    def __init__(self, score, width=60, height=4):
        super().__init__()
        self.score = score
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(HexColor('#E5E7EB'))
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        fill_w = self.width * self.score / 100
        if fill_w > 0:
            self.canv.setFillColor(score_color(self.score))
            self.canv.rect(0, 0, fill_w, self.height, fill=1, stroke=0)

# ── GÉNÉRATION ───────────────────────────────────────────────────────────────
def build_pdf(data, output_path):
    session_label = data.get('sessionLabel', 'Toutes promotions')
    participants  = data.get('participants', [])
    entries_map   = {e['participantId']: e for e in data.get('entries', []) if e}

    W, H = A4
    margin = 18 * mm
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=16*mm, bottomMargin=14*mm,
        title=f'Rapport Impact — {session_label}',
        author='NEODIS',
    )

    styles = getSampleStyleSheet()
    body_w = W - 2 * margin

    # ── STYLES ──────────────────────────────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    st_logo    = S('Logo',    fontName='Helvetica-Bold', fontSize=8,  leading=11, textColor=C_MUTED,  spaceAfter=3)
    st_title   = S('Title',   fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=C_DARK,   spaceAfter=4)
    st_sub     = S('Sub',     fontName='Helvetica',      fontSize=10, leading=14, textColor=C_GRAY,   spaceAfter=4)
    st_sect    = S('Sect',    fontName='Helvetica-Bold', fontSize=8,  leading=11, textColor=C_MUTED,
                              spaceAfter=6, spaceBefore=18, textTransform='uppercase',
                              borderPadding=(0,0,4,0))
    st_name    = S('Name',    fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=C_DARK,   spaceAfter=1)
    st_artist  = S('Artist',  fontName='Helvetica',      fontSize=9,  leading=12, textColor=C_MUTED)
    st_verbatim= S('Verbatim',fontName='Helvetica-Oblique',fontSize=10,textColor=C_TEXT,
                              leading=16, spaceAfter=6)
    st_proof_l = S('ProofL',  fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=C_GREEN)
    st_proof_t = S('ProofT',  fontName='Helvetica-Oblique',fontSize=9, textColor=C_TEXT, leading=14)
    st_cat_lbl = S('CatLbl',  fontName='Helvetica-Bold', fontSize=9,  leading=12, textColor=C_TEXT)
    st_cat_ex  = S('CatEx',   fontName='Helvetica-Oblique',fontSize=9, textColor=C_TEXT, leading=14, spaceAfter=4)
    st_footer  = S('Footer',  fontName='Helvetica',      fontSize=8,  leading=11, textColor=C_MUTED)
    st_small   = S('Small',   fontName='Helvetica',      fontSize=8,  leading=11, textColor=C_MUTED)

    # %-d non supporté sur macOS — on retire le zéro manuellement
    now = datetime.now()
    MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
    date_str = f"{now.day} {MOIS_FR[now.month - 1]} {now.year}"

    story = []

    # ── EN-TÊTE ──────────────────────────────────────────────────────────────
    story.append(Paragraph('NEODIS · UMANI TOWN', st_logo))
    story.append(Paragraph("Rapport d'impact post-formation", st_title))
    story.append(Paragraph(f'{session_label}', st_sub))
    story.append(Paragraph(f'Généré le {date_str} · Usage interne France Travail', st_sub))
    story.append(HRFlowable(width=body_w, thickness=1, color=C_BORDER, spaceAfter=12))

    # ── STATS ────────────────────────────────────────────────────────────────
    with_verbatim = [p for p in participants if entries_map.get(p['id'], {}).get('verbatim', '').strip()]
    en_activite   = sum(1 for p in participants if entries_map.get(p['id'], {}).get('statut') == 'activite')

    stats = [
        (str(len(participants)),  'Apprenants',     HX_DARK),
        (str(en_activite),        'En activité',    HX_GREEN),
        (str(len(with_verbatim)), 'Verbatims reçus', HX_PURPLE),
    ]
    stat_col_w = body_w / len(stats)
    stat_data = [[
        Paragraph(f'<font color="#{hx}" size="22"><b>{v}</b></font><br/>'
                  f'<font color="#9CA3AF" size="8">{l}</font>', styles['Normal'])
        for v, l, hx in stats
    ]]
    stat_table = Table(stat_data, colWidths=[stat_col_w] * len(stats))
    stat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_LIGHT),
        ('BOX',        (0,0), (-1,-1), 0.5, C_BORDER),
        ('GRID',       (0,0), (-1,-1), 0.5, C_BORDER),
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 16),
        ('ROUNDEDCORNERS', [4]),
    ]))
    story.append(stat_table)
    story.append(Spacer(1, 4*mm))

    # ── CLASSEMENT AMBASSADEURS ──────────────────────────────────────────────
    story.append(Paragraph('🏆  Score d\'impact — Ambassadeurs potentiels', st_sect))
    story.append(Paragraph(
        '<font color="#9CA3AF">Classement par score pour identifier les profils prioritaires '
        'pour un témoignage vidéo ou un rôle d\'ambassadeur régional.</font>',
        S('Info', fontName='Helvetica', fontSize=8, textColor=C_MUTED, spaceAfter=8)
    ))

    # Uniquement les participants ayant répondu (score > 0)
    scored = sorted(
        [(p, entries_map.get(p['id'], {})) for p in participants
         if compute_score(entries_map.get(p['id'], {})) > 0],
        key=lambda x: compute_score(x[1]),
        reverse=True
    )

    for p, entry in scored:
        score  = compute_score(entry)
        statut = entry.get('statut', '')
        s_lbl  = STATUT_LABELS.get(statut, 'Non contacté')
        s_hex  = STATUT_HEX.get(statut, HX_MUTED)
        proofs = extract_proofs(entry.get('verbatim', ''))
        artist = p.get('nomArtiste', '—')

        def _sc_hex(s):
            if s >= 70: return HX_GREEN
            if s >= 40: return HX_ORANGE
            return HX_GRAY
        sc_hex = _sc_hex(score)

        row_data = [[
            Paragraph(f'<b>{p.get("nom","")}</b>'
                      + (f'  <font size="8" color="#9CA3AF">{artist}</font>' if artist != '—' else ''),
                      S('RN', fontName='Helvetica-Bold', fontSize=10, textColor=C_DARK)),
            Paragraph(f'<font color="#{s_hex}">{s_lbl}</font>',
                      S('RS', fontName='Helvetica', fontSize=9, alignment=TA_CENTER)),
            Paragraph(f'<font color="#{sc_hex}"><b>{score}</b></font>/100',
                      S('RSc', fontName='Helvetica-Bold', fontSize=10, alignment=TA_RIGHT, textColor=C_GRAY)),
        ]]
        row_table = Table(row_data, colWidths=[body_w*0.55, body_w*0.25, body_w*0.20])
        row_table.setStyle(TableStyle([
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LINEBELOW',     (0,0), (-1,-1), 0.3, C_BORDER),
        ]))
        story.append(row_table)

    story.append(Spacer(1, 4*mm))

    # ── VERBATIMS PAR CATÉGORIE ──────────────────────────────────────────────
    if with_verbatim:
        story.append(HRFlowable(width=body_w, thickness=0.5, color=C_BORDER, spaceAfter=2))
        story.append(Paragraph('Verbatims structurés par thématique', st_sect))

        for cat, meta_label in CAT_LABELS.items():
            cat_col   = CAT_COLORS[cat]
            cat_items = []
            for p in with_verbatim:
                entry   = entries_map.get(p['id'], {})
                cats    = categorize(entry.get('verbatim', ''))
                phrases = cats.get(cat, [])
                for phrase in phrases:
                    cat_items.append((p.get('nom', ''), phrase))

            if not cat_items:
                continue

            cat_hex_map = {'technique': HX_PURPLE, 'confiance': HX_ORANGE, 'professionnel': HX_GREEN, 'reseau': HX_BLUE}
            cat_hex = cat_hex_map.get(cat, HX_GRAY)
            story.append(Paragraph(
                f'<font color="#{cat_hex}">■</font>  <b>{meta_label}</b>',
                S('CatH', fontName='Helvetica-Bold', fontSize=10, textColor=C_DARK,
                  spaceBefore=10, spaceAfter=4)
            ))

            for nom, phrase in cat_items:
                block = KeepTogether([
                    Paragraph(f'« {phrase} »', st_verbatim),
                    Paragraph(f'— {nom}', st_small),
                    Spacer(1, 3*mm),
                ])
                story.append(block)

        story.append(Spacer(1, 4*mm))

    # ── PREUVES CONCRÈTES ────────────────────────────────────────────────────
    all_proofs = []
    for p in with_verbatim:
        entry = entries_map.get(p['id'], {})
        for label, sentence in extract_proofs(entry.get('verbatim', '')):
            all_proofs.append((p.get('nom', ''), label, sentence))

    if all_proofs:
        story.append(HRFlowable(width=body_w, thickness=0.5, color=C_BORDER, spaceAfter=2))
        story.append(Paragraph('✅  Preuves concrètes identifiées', st_sect))
        story.append(Paragraph(
            '<font color="#9CA3AF">Faits vérifiables à mettre en avant dans le dossier France Travail.</font>',
            S('Info2', fontName='Helvetica', fontSize=8, textColor=C_MUTED, spaceAfter=8)
        ))

        for nom, label, sentence in all_proofs:
            proof_data = [[
                Paragraph(f'<b>{label}</b>', st_proof_l),
                Paragraph(f'<i>« {sentence} »</i><br/><font color="#9CA3AF" size="8">— {nom}</font>',
                          S('PT', fontName='Helvetica-Oblique', fontSize=9, textColor=C_TEXT, leading=14)),
            ]]
            proof_table = Table(proof_data, colWidths=[body_w*0.22, body_w*0.78])
            proof_table.setStyle(TableStyle([
                ('VALIGN',        (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING',    (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('BACKGROUND',    (0,0), (-1,-1), HexColor('#F0FFF4')),
                ('LINEBELOW',     (0,0), (-1,-1), 0.3, HexColor('#BBF7D0')),
                ('LEFTPADDING',   (0,0), (-1,-1), 8),
                ('RIGHTPADDING',  (0,0), (-1,-1), 8),
            ]))
            story.append(KeepTogether([proof_table, Spacer(1, 1*mm)]))

    # ── PIED DE PAGE (via doc template) ─────────────────────────────────────
    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(C_MUTED)
        canvas.drawString(margin, 8*mm, 'NEODIS · Document confidentiel · Usage interne France Travail')
        canvas.drawRightString(W - margin, 8*mm, f'Page {doc.page}')
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

# ── ENTRÉE ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 generate_rapport_pdf.py <input.json> <output.pdf>', file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)

    build_pdf(data, sys.argv[2])
    print(f'PDF généré : {sys.argv[2]}')
