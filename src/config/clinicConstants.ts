// Optional clinic contact points. Leave null to hide buttons.
export const CLINIC_CALL_PHONE_E164: string | null = null; // e.g., "+919999999999"
export const CLINIC_WHATSAPP_E164: string | null = null; // e.g., "+919999999999"

export type ClinicPromo = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  deep_link?: string | null;
  is_active?: boolean;
};

// Fallback promos if Supabase table `promos` is missing or empty
export const CLINIC_PROMOS: ClinicPromo[] = [
  {
    id: 'promo-physio-eval',
    title: 'Free Physio Evaluation',
    subtitle: 'Limited time for new patients',
    image_url: null,
    deep_link: 'https://physiosmetic.com/promos/physio-eval',
    is_active: true,
  },
  {
    id: 'promo-sports-pack',
    title: 'Sports Performance Pack',
    subtitle: 'Save 20% on 5 sessions',
    image_url: null,
    deep_link: 'https://physiosmetic.com/promos/sports-pack',
    is_active: true,
  },
];
