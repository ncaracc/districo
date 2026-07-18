export type Paese = {
  nome: string
  iso2: string
  prefisso: string
  /** Label del campo provincia/stato/regione per questo paese; null se il campo non si applica */
  labelProvincia: string | null
}

export const PAESE_DEFAULT = 'Italia'

export const PAESI: Paese[] = [
  { nome: 'Italia', iso2: 'IT', prefisso: '+39', labelProvincia: 'Provincia' },
  { nome: 'Città del Vaticano', iso2: 'VA', prefisso: '+379', labelProvincia: null },
  { nome: 'San Marino', iso2: 'SM', prefisso: '+378', labelProvincia: null },
  { nome: 'Francia', iso2: 'FR', prefisso: '+33', labelProvincia: 'Regione' },
  { nome: 'Germania', iso2: 'DE', prefisso: '+49', labelProvincia: 'Land' },
  { nome: 'Spagna', iso2: 'ES', prefisso: '+34', labelProvincia: 'Provincia' },
  { nome: 'Portogallo', iso2: 'PT', prefisso: '+351', labelProvincia: 'Distretto' },
  { nome: 'Regno Unito', iso2: 'GB', prefisso: '+44', labelProvincia: 'Contea' },
  { nome: 'Irlanda', iso2: 'IE', prefisso: '+353', labelProvincia: 'Contea' },
  { nome: 'Svizzera', iso2: 'CH', prefisso: '+41', labelProvincia: 'Cantone' },
  { nome: 'Austria', iso2: 'AT', prefisso: '+43', labelProvincia: 'Land' },
  { nome: 'Belgio', iso2: 'BE', prefisso: '+32', labelProvincia: 'Provincia' },
  { nome: 'Paesi Bassi', iso2: 'NL', prefisso: '+31', labelProvincia: 'Provincia' },
  { nome: 'Lussemburgo', iso2: 'LU', prefisso: '+352', labelProvincia: null },
  { nome: 'Polonia', iso2: 'PL', prefisso: '+48', labelProvincia: 'Voivodato' },
  { nome: 'Repubblica Ceca', iso2: 'CZ', prefisso: '+420', labelProvincia: 'Regione' },
  { nome: 'Slovacchia', iso2: 'SK', prefisso: '+421', labelProvincia: 'Regione' },
  { nome: 'Ungheria', iso2: 'HU', prefisso: '+36', labelProvincia: 'Contea' },
  { nome: 'Romania', iso2: 'RO', prefisso: '+40', labelProvincia: 'Distretto' },
  { nome: 'Bulgaria', iso2: 'BG', prefisso: '+359', labelProvincia: 'Provincia' },
  { nome: 'Grecia', iso2: 'GR', prefisso: '+30', labelProvincia: 'Regione' },
  { nome: 'Croazia', iso2: 'HR', prefisso: '+385', labelProvincia: 'Contea' },
  { nome: 'Slovenia', iso2: 'SI', prefisso: '+386', labelProvincia: 'Regione' },
  { nome: 'Serbia', iso2: 'RS', prefisso: '+381', labelProvincia: 'Distretto' },
  { nome: 'Albania', iso2: 'AL', prefisso: '+355', labelProvincia: 'Contea' },
  { nome: 'Danimarca', iso2: 'DK', prefisso: '+45', labelProvincia: 'Regione' },
  { nome: 'Svezia', iso2: 'SE', prefisso: '+46', labelProvincia: 'Contea' },
  { nome: 'Norvegia', iso2: 'NO', prefisso: '+47', labelProvincia: 'Contea' },
  { nome: 'Finlandia', iso2: 'FI', prefisso: '+358', labelProvincia: 'Regione' },
  { nome: 'Islanda', iso2: 'IS', prefisso: '+354', labelProvincia: null },
  { nome: 'Estonia', iso2: 'EE', prefisso: '+372', labelProvincia: 'Contea' },
  { nome: 'Lettonia', iso2: 'LV', prefisso: '+371', labelProvincia: 'Regione' },
  { nome: 'Lituania', iso2: 'LT', prefisso: '+370', labelProvincia: 'Contea' },
  { nome: 'Ucraina', iso2: 'UA', prefisso: '+380', labelProvincia: 'Oblast' },
  { nome: 'Russia', iso2: 'RU', prefisso: '+7', labelProvincia: 'Regione' },
  { nome: 'Turchia', iso2: 'TR', prefisso: '+90', labelProvincia: 'Provincia' },
  { nome: 'Stati Uniti', iso2: 'US', prefisso: '+1', labelProvincia: 'Stato' },
  { nome: 'Canada', iso2: 'CA', prefisso: '+1', labelProvincia: 'Provincia' },
  { nome: 'Messico', iso2: 'MX', prefisso: '+52', labelProvincia: 'Stato' },
  { nome: 'Brasile', iso2: 'BR', prefisso: '+55', labelProvincia: 'Stato' },
  { nome: 'Argentina', iso2: 'AR', prefisso: '+54', labelProvincia: 'Provincia' },
  { nome: 'Cile', iso2: 'CL', prefisso: '+56', labelProvincia: 'Regione' },
  { nome: 'Colombia', iso2: 'CO', prefisso: '+57', labelProvincia: 'Dipartimento' },
  { nome: 'Perù', iso2: 'PE', prefisso: '+51', labelProvincia: 'Regione' },
  { nome: 'Cina', iso2: 'CN', prefisso: '+86', labelProvincia: 'Provincia' },
  { nome: 'Giappone', iso2: 'JP', prefisso: '+81', labelProvincia: 'Prefettura' },
  { nome: 'Corea del Sud', iso2: 'KR', prefisso: '+82', labelProvincia: 'Provincia' },
  { nome: 'India', iso2: 'IN', prefisso: '+91', labelProvincia: 'Stato' },
  { nome: 'Australia', iso2: 'AU', prefisso: '+61', labelProvincia: 'Stato' },
  { nome: 'Nuova Zelanda', iso2: 'NZ', prefisso: '+64', labelProvincia: 'Regione' },
  { nome: 'Sudafrica', iso2: 'ZA', prefisso: '+27', labelProvincia: 'Provincia' },
  { nome: 'Egitto', iso2: 'EG', prefisso: '+20', labelProvincia: 'Governatorato' },
  { nome: 'Marocco', iso2: 'MA', prefisso: '+212', labelProvincia: 'Regione' },
  { nome: 'Emirati Arabi Uniti', iso2: 'AE', prefisso: '+971', labelProvincia: 'Emirato' },
]

export function trovaPaese(nome: string): Paese | undefined {
  return PAESI.find((p) => p.nome === nome)
}
