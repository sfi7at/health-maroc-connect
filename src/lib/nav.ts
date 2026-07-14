import {
  Home,
  Search,
  Heart,
  Stethoscope,
  Pill,
  Building2,
  FlaskConical,
  Tablets,
  Sparkles,
  CalendarCheck,
  User,
  Droplet,
  Info,
  Mail,
  FileText,
  Shield,
  Map as MapIcon,
  CalendarRange,
  ShieldCheck,
  Newspaper,
  HelpCircle,
  ShoppingBag,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  /** Restrict visibility to a specific role. Undefined = visible to all. */
  requires?: "doctor" | "admin";
}

export const primaryNav: NavItem[] = [
  { label: "Accueil", to: "/", icon: Home },
  { label: "Recherche", to: "/search", icon: Search },
  { label: "Carte santé", to: "/map", icon: MapIcon },
  { label: "Médecins", to: "/doctors", icon: Stethoscope },
  { label: "Pharmacies", to: "/pharmacies", icon: Pill },
  { label: "Hôpitaux", to: "/hospitals", icon: Building2 },
  { label: "Laboratoires", to: "/laboratories", icon: FlaskConical },
  { label: "Médicaments", to: "/medicaments", icon: Tablets },
  { label: "Boutique", to: "/products", icon: ShoppingBag },
  { label: "Don du sang", to: "/blood", icon: Droplet },
  { label: "Assistant IA", to: "/ai-assistant", icon: Sparkles },
  { label: "Santé & actualités", to: "/content", icon: Newspaper },
  { label: "FAQ", to: "/faq", icon: HelpCircle },
  { label: "RDV", to: "/appointments", icon: CalendarCheck },
  { label: "Mes commandes", to: "/orders", icon: Package },
];

export const secondaryNav: NavItem[] = [
  { label: "Espace prestataire", to: "/provider", icon: Stethoscope, requires: "doctor" },
  { label: "Agenda prestataire", to: "/provider/calendar", icon: CalendarRange, requires: "doctor" },
  { label: "Console Admin", to: "/admin", icon: ShieldCheck, requires: "admin" },
];

export const footerNav: NavItem[] = [
  { label: "À propos", to: "/about", icon: Info },
  { label: "Contact", to: "/contact", icon: Mail },
];

export const legalNav: NavItem[] = [
  { label: "Confidentialité", to: "/privacy", icon: Shield },
  { label: "Conditions d'utilisation", to: "/terms", icon: FileText },
];

export const mobileBottomNav: NavItem[] = [
  { label: "Accueil", to: "/", icon: Home },
  { label: "Carte", to: "/map", icon: MapIcon },
  { label: "Don", to: "/blood", icon: Heart },
  { label: "RDV", to: "/appointments", icon: CalendarCheck },
  { label: "Profil", to: "/profile", icon: User },
];