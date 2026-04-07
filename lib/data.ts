// lib/data.ts — données NEODIS CRM

export type SessionStatus = 'active' | 'upcoming' | 'done'
export type Financeur = 'France Travail' | 'OPCO'
export type TypeFT = 'Prest@ppli' | 'AIF' | ''

export type ImpactPeriode = '3mois' | '6mois' | '12mois'
export type ImpactStatut = 'activite' | 'recherche' | 'sans_nouvelles' | ''

export interface ImpactEntry {
  participantId: number
  periode: ImpactPeriode
  statut: ImpactStatut
  verbatim: string
  releases: number
  contrats: number
  contactDate: string
}

export interface PlanningEntry {
  formateurId: number
  heures: number
  module: string
  paiement?: 'en_attente' | 'paye'   // suivi paiement formateur
  paiementDate?: string               // date du règlement (ISO ou FR)
}

export interface Session {
  id: number
  name: string
  financeur: Financeur
  typeFT?: TypeFT
  duree: '35h' | '60h'
  dates: string
  participants: number
  status: SessionStatus
  sheetGid?: string
  planning?: PlanningEntry[]
  checklist?: Record<string, boolean>
  montantCA?: number   // forfait global (ex. Prest@ppli) — si absent, calcul par participant × tarif AIF
}

export type OPCOStatus = 'en_attente' | 'valide' | 'refuse' | ''
export type AssiduiteStatus = 'suivi_complet' | 'abandonne' | 'jamais_presente' | ''

export interface Participant {
  id: number
  nom: string
  nomArtiste: string
  email: string
  tel: string
  region: string
  adresse: string
  session: string
  financeur: string
  parcours: boolean[]
  youtube: string
  streaming: string
  spotifyTitre: string
  titreSingle: string
  insta: string
  lienUMANI: string
  idFT: string
  numConvention: string
  factures: string
  initials: string
  tags?: string[]
  opcoStatus?: OPCOStatus
  assiduite?: AssiduiteStatus
}

export interface FormateurLien {
  label: string
  url: string
}

export interface Formateur {
  id: number
  nom: string
  spec: string[]
  tarifHoraire?: number
  photo?: string
  cv?: { name: string; data: string; size: string; cat?: string }
  email: string
  tel: string
  statut: 'verified' | 'contact'
  type: 'principal' | 'masterclass'
  token?: string                // token unique pour l'espace formateur public
  liens?: FormateurLien[]       // liens personnalisés (umani.town, etc.)
}

export interface MembreEquipe {
  id: number
  prenom: string
  nom: string
  role: string
  email: string
  tel: string
  photo?: string
  linkedEmail?: string  // email du compte CRM associé
}

export const equipeData: MembreEquipe[] = [
  { id: 1, prenom: 'David',    nom: 'BERDUGO',   role: '',  email: 'goldey@neodis-medias.fr',    tel: '', linkedEmail: 'goldey@neodis-medias.fr' },
  { id: 2, prenom: 'David',    nom: 'ABAKAN',    role: '',  email: 'abakan@neodis-medias.fr',    tel: '', linkedEmail: 'abakan@neodis-medias.fr' },
  { id: 3, prenom: 'Harry',    nom: 'ROSELMACK', role: '',  email: 'harry@neodis-medias.fr',     tel: '', linkedEmail: 'harry@neodis-medias.fr' },
  { id: 4, prenom: 'Jennifer', nom: 'GALAP',     role: '',  email: 'jennifer.galap@umani.town',  tel: '', linkedEmail: 'jennifer.galap@umani.town' },
  { id: 5, prenom: 'Philip',   nom: 'NESMES',    role: '',  email: 'philip@neodis-medias.fr',    tel: '', linkedEmail: 'philip@neodis-medias.fr' },
]

// ── SESSIONS ──
export const sessionsData: Session[] = [
  {
    id: 50,
    name: 'Promo UMANI 20-24 oct. 2025',
    financeur: 'France Travail',
    typeFT: 'Prest@ppli',
    montantCA: 30000,
    duree: '35h',
    dates: '20 oct. — 24 oct. 2025',
    participants: 14,
    status: 'done',
    sheetGid: '0',
    planning: [
      { formateurId: 3, heures: 3.5, module: "Identité d'artiste" },
      { formateurId: 1, heures: 7,   module: 'Streaming (J2 + J4 matin)' },
      { formateurId: 5, heures: 14,  module: 'MAO (J2 à J5 après-midi)' },
      { formateurId: 4, heures: 3.5, module: 'Marketing musical (J3 matin)' },
      { formateurId: 2, heures: 3.5, module: 'Marketing avancé (J5 matin)' },
      { formateurId: 7, heures: 3,   module: "Masterclass écriture" },
      { formateurId: 6, heures: 3,   module: 'Masterclass droits / SACEM' },
    ],
  },
  {
    id: 51,
    name: 'Promo UMANI 17-21 nov. 2025',
    financeur: 'France Travail',
    typeFT: 'AIF',
    duree: '35h',
    dates: '17 nov. — 21 nov. 2025',
    participants: 9,
    status: 'done',
    sheetGid: '1561661559',
    planning: [
      { formateurId: 3, heures: 3.5,  module: "Identité d'artiste (J1 matin)" },
      { formateurId: 1, heures: 10.5, module: 'Streaming + Branding (J1 AM + J2 + J4 matin)' },
      { formateurId: 4, heures: 3.5,  module: 'Marketing musical (J3 matin)' },
      { formateurId: 5, heures: 14,   module: 'MAO (J2 à J5 après-midi)' },
      { formateurId: 2, heures: 3.5,  module: 'Marketing avancé (J5 matin)' },
      { formateurId: 7, heures: 3,    module: "Masterclass écriture" },
      { formateurId: 6, heures: 3,    module: 'Masterclass droits / SACEM' },
    ],
  },
  {
    id: 52,
    name: 'Promo UMANI 24-28 nov. 2025',
    financeur: 'France Travail',
    typeFT: 'AIF',
    duree: '35h',
    dates: '24 nov. — 28 nov. 2025',
    participants: 9,
    status: 'done',
    sheetGid: '941835424',
    planning: [
      { formateurId: 3, heures: 3.5,  module: "Identité d'artiste (J1 matin)" },
      { formateurId: 1, heures: 10.5, module: 'Streaming + Branding (J1 AM + J2 + J4 matin)' },
      { formateurId: 4, heures: 3.5,  module: 'Marketing musical (J3 matin)' },
      { formateurId: 5, heures: 14,   module: 'MAO (J2 à J5 après-midi)' },
      { formateurId: 2, heures: 3.5,  module: 'Marketing avancé (J5 matin)' },
      { formateurId: 7, heures: 3,    module: "Masterclass écriture" },
      { formateurId: 6, heures: 3,    module: 'Masterclass droits / SACEM' },
    ],
  },
]

// ── PARTICIPANTS ──
export const participantsData: Participant[] = [
  { id: 101, nom: 'Mélodie Spartacus', nomArtiste: 'SpartacusMelo', email: 'cubamartinique@gmail.com', tel: '—', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=dO5itfPZGok', streaming: 'https://open.spotify.com/intl-fr/artist/24cbFrbyyDhfcoQ1M8RWyM', spotifyTitre: 'https://open.spotify.com/intl-fr/album/267C1mtbMu90yeLzjsyydy', titreSingle: 'Química', insta: 'https://www.instagram.com/spartacusmelo', lienUMANI: 'https://map.umani.town/@/campus?access_key=71e6fde9-bb7f-4cf4-b396-a8b3a407b2c8', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'MS' },
  { id: 102, nom: 'David Obadia', nomArtiste: 'OBA', email: '—', tel: '07 83 18 16 03', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=8jrBmNUUp2I', streaming: 'https://open.spotify.com/intl-fr/artist/2MkbwCDK0gSdM5USS8uQx5', spotifyTitre: 'https://open.spotify.com/intl-fr/track/6c0FYHpreYd7NpXGUEU9HE', titreSingle: 'Né pour briller', insta: 'https://www.instagram.com/oba.fireal', lienUMANI: 'https://map.umani.town/@/campus?access_key=a354b552-c6d6-4aa9-9efc-3246509918a1', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'DO' },
  { id: 103, nom: 'Laura Aline Valey', nomArtiste: 'Lauraline', email: '—', tel: '07 67 97 60 21', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=rF1SgZLZYho', streaming: 'https://open.spotify.com/intl-fr/artist/36k13eh2Uw8jlUnCZuQNoU', spotifyTitre: 'https://open.spotify.com/album/4BetGWGR1itgdZaEIPTFVB', titreSingle: 'PHG', insta: 'https://www.instagram.com/lauralineofficiel', lienUMANI: 'https://map.umani.town/@/campus?access_key=5bb09812-c464-4e08-8805-521402d83f5d', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'LV' },
  { id: 104, nom: 'Jerome Menir', nomArtiste: 'Jiirny', email: '—', tel: '06 96 52 68 40', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=atnIxU3BFUM', streaming: 'https://open.spotify.com/intl-fr/artist/29T0eALxuxdZBhYNLooEps', spotifyTitre: 'https://open.spotify.com/album/69zxTzwK5FJ3cf5HSG6abd', titreSingle: 'Komedi', insta: 'https://www.instagram.com/iamjiirny', lienUMANI: 'https://map.umani.town/@/campus?access_key=28e90945-d022-43de-87d9-73f23a61070b', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'JM' },
  { id: 105, nom: 'Kassidy Dicanot', nomArtiste: 'Kasidi', email: '—', tel: '07 81 85 01 09', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=cXhNZFoEGA8', streaming: 'https://open.spotify.com/intl-fr/artist/3dvvkifRsLkr70WI0V7wMI', spotifyTitre: 'https://open.spotify.com/intl-fr/track/3zH3MYJLzZMr5wqQXe9325', titreSingle: 'Mwen sé fos', insta: 'https://www.instagram.com/kasidi.off', lienUMANI: 'https://map.umani.town/@/campus?access_key=671f4b19-19a5-4fe0-b7ae-7fc44483c229', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'KD' },
  { id: 106, nom: 'Gladys Dubois', nomArtiste: 'Demwazel Dys', email: '—', tel: '07 84 59 54 83', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=NJVmprlt_cc', streaming: 'https://open.spotify.com/intl-fr/artist/5Gt2CsGvBWQUNWb1lTYDdO', spotifyTitre: 'https://open.spotify.com/album/4WJLlG2vth7eMELJsX7rQa', titreSingle: "Mamn m'a pas dit", insta: 'https://www.instagram.com/demwazel_dys', lienUMANI: 'https://map.umani.town/@/campus?access_key=3cf1a88d-68dd-4f77-b0c5-420b6a91a0b1', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'GD' },
  { id: 107, nom: 'Enzo Rochemont', nomArtiste: 'SVKVP', email: '—', tel: '06 96 66 88 73', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=Q6dRUCS154M', streaming: 'https://open.spotify.com/intl-fr/artist/02fz1Da87OmZSs50vlMMtl', spotifyTitre: 'https://open.spotify.com/intl-fr/album/1R0YqYdSxO5IR0GWCbFoTQ', titreSingle: 'Canin', insta: 'https://www.instagram.com/svkvp_r', lienUMANI: 'https://map.umani.town/@/campus?access_key=56207553-c1da-449c-8415-a17355d0362e', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'ER' },
  { id: 108, nom: 'Jessica Joly', nomArtiste: 'Jessica Joly', email: '—', tel: '06 96 29 69 78', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=YtazWmsY_1o', streaming: '—', spotifyTitre: '—', titreSingle: 'Fok Ou Sav', insta: 'https://www.instagram.com/jessicajoly972', lienUMANI: 'https://map.umani.town/@/campus?access_key=8e78c941-a236-4422-a386-40e5dbcfced6', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'JJ' },
  { id: 109, nom: 'Ivy Jalta', nomArtiste: 'Ivy Jalta', email: '—', tel: '06 96 78 00 35', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=_6xHyg71rws', streaming: 'https://open.spotify.com/intl-fr/artist/1ckAg0TinPDKjJX4t1Nr1Z', spotifyTitre: 'https://open.spotify.com/album/0MpJZXDbIydAK5hYJ0M6p2', titreSingle: 'Ou sé queen', insta: 'https://www.instagram.com/ivy_jalta', lienUMANI: 'https://map.umani.town/@/campus?access_key=297cfa2a-f3b9-4961-8dd4-54cc282b874f', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'IJ' },
  { id: 110, nom: 'Jennifer Vermignon', nomArtiste: 'Jennifer Vermignon', email: '—', tel: '06 96 33 43 56', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=yIPbTcNpDAs', streaming: 'https://open.spotify.com/intl-fr/artist/0sjrWyT9Qb1WsI96NUp0fy', spotifyTitre: 'https://open.spotify.com/intl-fr/track/6RP7nEmnrV4abxIL12wD3q', titreSingle: "Mwen Enmen'w", insta: 'https://www.instagram.com/jenn_vrm', lienUMANI: 'https://map.umani.town/@/campus?access_key=fb00989a-35e9-4c9f-a100-bc49a9cc5c62', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'JV' },
  { id: 111, nom: 'Maher Beauroy', nomArtiste: 'Maher Beauroy', email: '—', tel: '06 43 58 87 32', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=LqXL7Q8OAoY', streaming: 'https://open.spotify.com/intl-fr/artist/7BW6VQmd7E8daCn1zMI5DQ', spotifyTitre: 'https://open.spotify.com/intl-fr/album/0bkDEADYe4z529gZTUFack', titreSingle: 'Ki moun ou Yé', insta: 'https://www.instagram.com/maherbeauroy', lienUMANI: 'https://map.umani.town/@/campus?access_key=1bf8b086-fe6e-40d3-96a8-c35fb13658ce', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'MB' },
  { id: 112, nom: 'Ruben Career', nomArtiste: "Ruen's", email: '—', tel: '06 96 66 27 67', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=zid0-c1ilH8', streaming: 'https://open.spotify.com/intl-fr/artist/2dbFEBzgWHyz0aw4ZToTjn', spotifyTitre: 'https://open.spotify.com/intl-fr/track/6dnBZ5DayngHGt3ERT3nt8', titreSingle: 'Anlé Sa', insta: 'https://www.instagram.com/rubens.music', lienUMANI: 'https://map.umani.town/@/campus?access_key=a93eb287-ba85-4715-8077-954645352c72', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'RC' },
  { id: 113, nom: 'Emmanuelle Pastel', nomArtiste: 'Angem', email: '—', tel: '06 96 88 31 16', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: 'https://www.youtube.com/watch?v=b9jYPbs1X0M', streaming: 'https://open.spotify.com/intl-fr/artist/4AbNj45mK4Z9PLmygvhqFE', spotifyTitre: 'https://open.spotify.com/intl-fr/album/6tm2AEzR9sa9WxX2Ad8oBd', titreSingle: 'Pa kité mwen', insta: 'https://www.instagram.com/angemmusic_off', lienUMANI: 'https://map.umani.town/@/campus?access_key=e9c15d97-dd5f-4976-8dd1-606d4f5445b4', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'EP' },
  { id: 114, nom: 'Maeva Marie-Angélique', nomArtiste: 'SILAYÉ', email: '—', tel: '06 96 98 74 64', region: '—', adresse: '—', session: 'Promo UMANI 20-24 oct. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: 'https://open.spotify.com/intl-fr/artist/1kiXpa3VP29Cg9WXNyMUbV', spotifyTitre: 'https://open.spotify.com/intl-fr/track/6cs5RasOf71QyVpH1cwsOo', titreSingle: 'Gadé yo', insta: 'https://www.instagram.com/silaye_mizik', lienUMANI: 'https://map.umani.town/@/campus?access_key=d748212e-196d-44e1-b071-f09d30072cc7', idFT: '—', numConvention: '—', factures: 'Facture unique Prest@ppli', initials: 'MMA' },

  // ── PROMO 17-21 NOV. 2025 ──
  { id: 201, nom: 'Doré Bertrand', nomArtiste: 'doresowlo', email: 'bertran.dor@gmail.com', tel: '06 96 36 42 70', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/doresowlo_officiel', lienUMANI: 'https://map.umani.town/@/campus?access_key=a054c4a3-61d4-4344-8520-40aee37d88b6', idFT: '0233252K', numConvention: '41C67G301295', factures: 'F-2025-006', initials: 'DB' },
  { id: 202, nom: 'Ursulet Jean-Jacques', nomArtiste: '—', email: 'ursulet.jeanjacques@gmail.com', tel: '06 96 26 79 82', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/ursulet.jeanjacques', lienUMANI: 'https://map.umani.town/@/campus?access_key=86ded20f-0051-4330-8d8a-88503d04a886', idFT: '0312662A', numConvention: '41C67G301297', factures: 'F-2025-007', initials: 'UJ' },
  { id: 203, nom: 'Lorgeril Arnaud', nomArtiste: 'Nyah Hazy', email: 'arnaudlorgeril@yahoo.fr', tel: '06 96 03 07 87', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/nyahhazy', lienUMANI: 'https://map.umani.town/@/campus?access_key=2902d255-e32c-41b6-a25d-4b082c107c9b', idFT: '0493225P', numConvention: '41C67G301431', factures: 'F-2025-008', initials: 'LA' },
  { id: 204, nom: 'Fonclaud Jérémie', nomArtiste: '—', email: 'boogly972@gmail.com', tel: '0696.05.06.25', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=39b9742a-9afd-4c6a-ab3c-3ed6f60b3277', idFT: '0525697K', numConvention: '41C67G301151', factures: 'F-2025-009', initials: 'FJ' },
  { id: 205, nom: 'Jean-Alphonse Christen', nomArtiste: 'Christen Jeal', email: 'christen.jean-alphonse@live.fr', tel: '0696 07 91 80', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/christenjeal', lienUMANI: 'https://map.umani.town/@/campus?access_key=fd7b9846-da53-4e12-88dc-ce840939c790', idFT: '0545360H', numConvention: '41C67G301425', factures: 'F-2025-010', initials: 'JC' },
  { id: 206, nom: 'Lavier Rudolphe', nomArtiste: 'Madalaskar prod', email: 'conjik@gmail.com', tel: '06 96 19 24 40', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/madalaskarprod', lienUMANI: 'https://map.umani.town/@/campus?access_key=3451c5cf-68e4-4566-8f77-359e311073c5', idFT: '0459166U', numConvention: '41C67G301302', factures: 'F-2025-011', initials: 'LR' },
  { id: 207, nom: 'Sejean Stephen', nomArtiste: 'zikfen', email: 'fen97@live.fr', tel: '06 96 34 06 90', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/zikfen', lienUMANI: 'https://map.umani.town/@/campus?access_key=acb84760-3f29-435b-80a1-4d2136a9c450', idFT: '0535594T', numConvention: '41C67G301298', factures: 'F-2025-012', initials: 'SS' },
  { id: 208, nom: 'Ursulet Nina', nomArtiste: 'Naynah', email: 'nina.ursulet@gmail.com', tel: '06 96 86 39 15', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: 'https://www.instagram.com/naynah', lienUMANI: 'https://map.umani.town/@/campus?access_key=d0cc39b3-9684-4a18-b70b-86bdff71d525', idFT: '0574214W', numConvention: '41C67G301308', factures: 'F-2025-013', initials: 'UN' },
  { id: 209, nom: 'Ayanah Mouflet', nomArtiste: '—', email: 'ayannamouflet@gmail.com', tel: '06 96 48 64 19', region: '—', adresse: '—', session: 'Promo UMANI 17-21 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=7742b4cc-6b51-48f9-8507-5fb192351e33', idFT: '0528250K', numConvention: '41C67G301706', factures: 'F-2025-014', initials: 'MA' },

  // ── PROMO 24-28 NOV. 2025 ──
  { id: 301, nom: 'Aymerick Gertrude', nomArtiste: '—', email: 'emerickgertrude@gmail.com', tel: '06 96 48 11 05', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=39983152-3613-4a88-ada4-41342ffeb74e', idFT: '0570379C', numConvention: '41C67G303267', factures: '—', initials: 'AG' },
  { id: 302, nom: 'Joel Lutbert', nomArtiste: '—', email: 'lutbertjoel@live.fr', tel: '06 96 01 55 50', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=d833bb09-ff4a-4da4-a113-509271ffc14e', idFT: '0213853Z', numConvention: '41C67G303268', factures: '—', initials: 'JL' },
  { id: 303, nom: 'Jean-Luc Guanel', nomArtiste: '—', email: 'jeanlucguanel@gmail.com', tel: '06 96 45 04 96', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=7992acc0-c4f2-4f8a-93df-50803ef7205d', idFT: '0233825H', numConvention: '41C67G303271', factures: '—', initials: 'JG' },
  { id: 304, nom: 'Sébastien Victorin', nomArtiste: '—', email: 'svictorin22@gmail.com', tel: '06 96 52 00 62', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=ec1c2aef-6d91-4f71-bb60-812c1e5c084d', idFT: '0418670B', numConvention: '41C67G303273', factures: '—', initials: 'SV' },
  { id: 305, nom: 'Elisa Trecasse', nomArtiste: '—', email: 'trecasse.elisa@gmail.com', tel: '06 96 66 65 95', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=c85a1966-ccdd-4d01-9f67-685d585aa428', idFT: '0606984R', numConvention: '41C67G303269', factures: '—', initials: 'ET' },
  { id: 306, nom: 'Lanah Souchette', nomArtiste: '—', email: 'lanah.souchette@yahoo.fr', tel: '06 96 05 45 01', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=561b73f0-dfbc-4134-aa6b-4665145cab52', idFT: '0562322V', numConvention: '41C67G303270', factures: '—', initials: 'LS' },
  { id: 307, nom: 'Frédiany Gody', nomArtiste: '—', email: 'fefeontherack@gail.com', tel: '06 96 08 19 45', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=935998d0-1752-4882-b2db-cf3018a191aa', idFT: '0511383B', numConvention: '41C67G303274', factures: '—', initials: 'FG' },
  { id: 308, nom: 'Jade Francisque', nomArtiste: '—', email: 'francisquejade17@gmail.com', tel: '06 96 89 85 95', region: '—', adresse: '—', session: 'Promo UMANI 24-28 nov. 2025', financeur: 'France Travail', parcours: [], youtube: '—', streaming: '—', spotifyTitre: '—', titreSingle: '—', insta: '—', lienUMANI: 'https://map.umani.town/@/campus?access_key=b79d6b8f-23c5-46e5-8329-5e9267899061', idFT: '0615600F', numConvention: '41C67G303272', factures: '—', initials: 'JF' },
]

// ── FORMATEURS ──
export const formateursData: Formateur[] = [
  { id: 1, nom: 'Abdelhak Guard',           spec: ['Streaming', 'Branding'],  email: 'guard.abdelhak@gmail.com',          tel: '06 58 61 99 59',    statut: 'verified', type: 'principal'   },
  { id: 2, nom: 'Cédric Roges',             spec: ['Marketing musical'],     email: 'cdqdn@hotmail.com',                 tel: '06 74 41 33 13',    statut: 'verified', type: 'principal'   },
  { id: 3, nom: 'Céline Fuselier',          spec: ["Identité d'artiste"],    email: 'celyne@storypulse.fr',              tel: '07 49 97 91 98',    statut: 'verified', type: 'principal'   },
  { id: 4, nom: 'Michèle Beletan',          spec: ['Marketing musical'],     email: 'michele.beltan@sfr.fr',             tel: '06 20 53 34 94',    statut: 'verified', type: 'principal'   },
  { id: 5, nom: 'Alexandre de Beauregard',  spec: ['MAO'],                   email: 'alexandre.de.beauregard@gmail.com', tel: '07 86 63 76 11',    statut: 'verified', type: 'principal'   },
  { id: 6, nom: 'Emmanuelle Bruch',         spec: ['Droits'],                email: 'emmanuelle.bruch@sacem.fr',         tel: '05 96 69 61 88 752',statut: 'verified', type: 'masterclass' },
  { id: 7, nom: 'Freddy Chellaoui',         spec: ['Écriture'],              email: 'freddyspherebooking@gmail.com',     tel: '06 74 67 57 57',    statut: 'verified', type: 'masterclass' },
]

// ── PARCOURS PÉDAGOGIQUE (18 étapes) ──
export const parcoursSteps = [
  'Onboarding UMANI Town',
  'Présentation de soi',
  'Bilan de compétences',
  'Formation MAO — Module 1',
  'Formation MAO — Module 2',
  'Production du single',
  'Direction artistique',
  'Shooting photo / vidéo',
  'Mixage & Mastering',
  'Distribution numérique',
  'Création du dossier artiste',
  'Stratégie réseaux sociaux',
  'Plan de communication',
  'Mise en ligne du single',
  'Lancement & promo',
  'Bilan de mi-parcours',
  'Plan de carrière',
  'Évaluation satisfaction à froid',
]

// ── VERBATIMS SEED (Impact post-formation) ──
// Période : ~3 mois après formation (oct/nov 2025 → mars 2026)
export const impactSeedData: ImpactEntry[] = [
  {
    participantId: 109, // Ivy Jalta — oct.
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `Suite à la formation sur le campus digital Umani Town, je peux dire que cette expérience a marqué un vrai tournant dans mon parcours.\nGrâce aux enseignements reçus, j'ai franchi une étape importante : j'ai composé et réalisé, pour la première fois, un titre entièrement seul. Un projet que je finalise en ce moment. Cette autonomie artistique représente énormément pour moi. Elle est le fruit d'une meilleure compréhension des outils, mais aussi d'une plus grande confiance en mes capacités.\nLes cours sur la MAO ont été un véritable déclic. Ils m'ont permis de mieux comprendre les processus de création, d'optimiser ma manière de produire et d'oser expérimenter davantage. La partie sur l'intelligence artificielle m'a également beaucoup apporté, notamment dans la manière d'explorer de nouvelles méthodes de travail et de structurer mes idées plus efficacement.\nLa masterclass d'écriture a été l'un des plus grands points forts pour moi. Elle m'a permis d'approfondir ma réflexion artistique, d'affiner ma manière d'exprimer mes messages et de structurer mes textes avec plus de puissance et de cohérence.\nConcernant la stratégie et le développement, je m'y intéressais déjà un peu auparavant. La formation n'a donc pas été une découverte totale sur ces aspects, mais elle a confirmé certaines intuitions que j'avais et m'a apporté des clés supplémentaires très concrètes. Aujourd'hui, je réfléchis davantage avant d'agir. Je mets en place des actions plus structurées pour renforcer mon image sur Google et sur les plateformes de streaming. J'adopte une approche plus stratégique et plus consciente dans la construction de mon projet.\nEnfin, j'ai apprécié absolument toutes les interventions proposées. Chacune, à sa manière, a été bénéfique et a contribué à élargir et améliorer ma vision des choses, que ce soit sur le plan artistique, stratégique ou personnel.\nUmani Town ne m'a pas seulement apporté des compétences techniques : cette expérience a renforcé mon état d'esprit, ma discipline et ma vision. Je mets concrètement en pratique ce que j'ai appris.`,
    releases: 0,
    contrats: 0,
  },
  {
    participantId: 113, // Emmanuelle Pastel / Angem — oct.
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `Grâce à UMANI Town, j'ai gagné en conscience des différents outils à ma disposition en tant qu'artiste. J'ai particulièrement appris à mieux comprendre les plateformes comme Suno et Spotify, ainsi que le milieu de l'édition musicale, ce qui m'était moins clair auparavant.\nCette formation m'a ouvert les yeux sur les nombreuses opportunités qui existent et m'a aidé à naviguer plus efficacement dans l'industrie. Je me sens désormais plus confiante dans mes choix et mes démarches en tant qu'artiste.\nEt en Bonus, un lien renforcé avec les autres artistes de la formation et plus généralement avec les membres actifs du paysage socioculturel martiniquais.\nMais ce qui m'a surtout plu c'est que enfin les ultra-marins n'étaient pas oubliés... mais considérés.`,
    releases: 0,
    contrats: 0,
  },
  {
    participantId: 101, // Mélodie Spartacus — oct.
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `J'ai beaucoup apprécié cette formation. Elle était à la fois dynamique et agréable, ce qui a rendu l'apprentissage vraiment plaisant. Les professeurs sont sympathiques, bienveillants et toujours à l'écoute, ce qui crée un environnement motivant et rassurant.\nJ'ai trouvé particulièrement intéressant le côté numérique, très bien intégré et pertinent dans le contenu proposé.\nJe suis sincèrement reconnaissante pour cette opportunité et pour la qualité de l'accompagnement. Merci pour cette belle expérience. Dans ma vie pro ça m'a aidé à m'ouvrir un peu sur les MAO, à vouloir apprendre à travailler les logiciels de création.`,
    releases: 0,
    contrats: 0,
  },
  {
    participantId: 204, // Fonclaud Jérémie — nov. 17-21
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `Pour ma part, je travaille dans la musique depuis 1998, je me suis professionnalisé au fur et à mesure essentiellement sur le live !\nLa formation m'a permis de me mettre à la MAO réellement pour mes pratiques (jouer avec des séquences). J'ai pu utiliser Logic en live lors de mes derniers concerts.\nLe volet sur les réseaux et l'image artistique a été aussi une façon de voir comment tout ça fonctionne actuellement. N'étant pas vraiment dans cette optique, je n'ai pas mis tout cela en pratique, cependant j'ai les outils pour me lancer si besoin !\nJ'ai beaucoup apprécié la disponibilité des formateurs, leur accessibilité, et leurs compétences dans divers domaines qui nous ont tous, je crois, été profitables à différents niveaux.\nPlus long et encore plus approfondi ne m'aurait pas déplu ! Merci encore et j'espère qu'il y en aura d'autres !`,
    releases: 0,
    contrats: 0,
  },
  {
    participantId: 208, // Ursulet Nina — nov. 17-21
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `Avant la formation, je composais ma musique de manière totalement autodidacte, seule dans ma chambre, sans vraiment savoir comment structurer ma démarche artistique ni comment transformer cette passion en véritable carrière professionnelle.\nSur le plan stratégique : la formation m'a aidée à structurer ma démarche artistique. J'ai maintenant une vision claire de mon calendrier de sorties pour 2026, avec une stratégie de singles plutôt qu'un EP, ce qui correspond mieux à mes objectifs de faire découvrir progressivement mon univers musical.\nSur le plan professionnel : j'ai donné mon premier concert guitare-voix en décembre 2025 avec 9 chansons, dont plusieurs compositions originales. La confiance acquise pendant la formation m'a permis de franchir ce cap et d'assumer pleinement ma démarche solo.\nConcrètement aujourd'hui : je travaille sur une stratégie YouTube, je développe mon identité visuelle et sonore de manière cohérente, et je prépare activement mes prochaines sorties musicales. Umani Town m'a donné les clés pour passer d'artiste "qui fait de la musique dans sa chambre" à artiste professionnelle qui construit une vraie carrière.`,
    releases: 0,
    contrats: 0,
  },
  {
    participantId: 306, // Lanah Souchette — nov. 24-28
    periode: '3mois',
    statut: 'activite',
    contactDate: '2026-03-01',
    verbatim: `La formation pour les artistes indépendants dispensée par Umani Town m'a permis d'asseoir mes compétences en matière de marketing, m'a permis d'acquérir des outils utiles et contacts importants pour favoriser la diffusion de mon art. Je suis ressortie plus polyvalente et avec d'autres compétences techniques pour l'enregistrement de mes compositions. J'ai une utilisation plus stratégique et maîtrisée de mes réseaux sociaux. Cela représente un tremplin non négligeable.`,
    releases: 0,
    contrats: 0,
  },
]

// ── AUTH USERS ──
export const authUsers = [
  { email: 'admin@neodis.fr', password: 'neodis2025', name: 'Admin', nom: 'NEODIS' },
  { email: 'goldey@neodis-medias.fr', password: 'neodis2026', name: 'David', nom: 'BERDUGO' },
  { email: 'abakan@neodis-medias.fr', password: 'neodis2026', name: 'David', nom: 'ABAKAN' },
  { email: 'philip@neodis-medias.fr', password: 'neodis2026', name: 'Philip', nom: 'NESMES' },
  { email: 'jennifer.galap@umani.town', password: 'neodis2026', name: 'Jennifer', nom: 'GALAP' },
  { email: 'harry@neodis-medias.fr', password: 'neodis2026', name: 'Harry', nom: 'ROSELMACK' },
]
