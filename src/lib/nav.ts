import {
  Home,
  Search,
  Heart,
  Stethoscope,
  Pill,
  Building2,
  FlaskConical,
  Sparkles,
  CalendarCheck,
  User,
  Bell,
  Star,
  Settings,
  Droplet,
  Info,
  Mail,
  FileText,
  Shield,
  Map as MapIcon,
  Clock,
  Siren,
  CalendarRange,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}

export const primaryNav: NavItem[] = [
  { label: "Accueil", to: "/", icon: Home },
  { label: "Recherche", to: "/search", icon: Search },
  { label: "Carte santé", to: "/map", icon: MapIcon },
  { label: "Médecins", to: "/doctors", icon: Stethoscope },
  { label: "Pharmacies", to: "/pharmacies", icon: Pill },
  { label: "Pharmacies de garde", to: "/pharmacies/on-duty", icon: Clock },
  { label: "Hôpitaux", to: "/hospitals", icon: Building2 },
  { label: "Urgences hôpitaux", to: "/hospitals/emergency", icon: Siren },
  { label: "Laboratoires", to: "/laboratories", icon: FlaskConical },
  { label: "Analyses médicales", to: "/laboratories/analyses", icon: FlaskConical },
  { label: "Don du sang", to: "/blood", icon: Droplet },
  { label: "Assistant IA", to: "/ai-assistant", icon: Sparkles },
  { label: "Rendez-vous", to: "/appointments", icon: CalendarCheck },
  { label: "Calendrier RDV", to: "/appointments/calendar", icon: CalendarRange },
];

export const secondaryNav: NavItem[] = [
  { label: "Profil médical", to: "/profile", icon: User },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Favoris", to: "/favorites", icon: Star },
  { label: "Espace prestataire", to: "/provider", icon: Stethoscope },
  { label: "Espace prestataire", to: "/provider-calendar", icon: CalendarRange },
  { label: "Console Admin", to: "/admin", icon: ShieldCheck },
  { label: "Paramètres", to: "/settings", icon: Settings },
];

export const footerNav: NavItem[] = [
  { label: "À propos", to: "/about", icon: Info },
  { label: "Contact", to: "/contact", icon: Mail },
  { label: "Confidentialité", to: "/privacy", icon: Shield },
  { label: "Conditions", to: "/terms", icon: FileText },
];

export const mobileBottomNav: NavItem[] = [
  { label: "Accueil", to: "/", icon: Home },
  { label: "Carte", to: "/map", icon: MapIcon },
  { label: "Don", to: "/blood", icon: Heart },
  { label: "RDV", to: "/appointments", icon: CalendarCheck },
  { label: "Profil", to: "/profile", icon: User },
];