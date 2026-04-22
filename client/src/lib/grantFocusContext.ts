/*
 * buildGrantFocusContext — enriches a user message with grant details
 * so the AI assistant responds in the context of a specific grant.
 *
 * Shared between AiAssistant page and GrantDetailPanel (Phase 6).
 * Accepts a language code so the system prompt matches the user's locale.
 * Falls back to English — LLMs handle English instructions most reliably.
 */

import type { ParsedGrant } from "@/components/GrantCard";

/**
 * Extended grant shape accepted by the focus context. Every field beyond
 * `ParsedGrant` is optional so callers can pass the minimum they have.
 * When present, extra fields (phone/email/eligibility/process/…) flow
 * into the system prompt so the assistant can answer questions about the
 * organization's services and contact details without extra tool calls.
 */
export interface FocusedGrantContext extends ParsedGrant {
  category?: string;
  eligibility?: string;
  applicationProcess?: string;
  targetDiagnosis?: string;
  ageRange?: string;
  geographicScope?: string;
  documentsRequired?: string;
  phone?: string;
  email?: string;
  address?: string;
  officeHours?: string;
  status?: string;
  fundingType?: string;
  b2VisaEligible?: string;
}

// ── Per-language prompt templates ────────────────────────────────────────────

interface PromptTemplate {
  grant: string;
  organization: string;
  location: string;
  amount: string;
  deadline: string;
  website: string;
  category: string;
  eligibility: string;
  process: string;
  diagnosis: string;
  age: string;
  scope: string;
  documents: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  status: string;
  funding: string;
  visa: string;
  instruction: string;
}

const TEMPLATES: Record<string, PromptTemplate> = {
  en: {
    grant: "Grant",
    organization: "Organization",
    location: "Location",
    amount: "Amount",
    deadline: "Deadline",
    website: "Website",
    category: "Category",
    eligibility: "Who can apply",
    process: "Application process",
    diagnosis: "Target conditions",
    age: "Age range",
    scope: "Geographic scope",
    documents: "Required documents",
    phone: "Phone",
    email: "Email",
    address: "Address",
    hours: "Office hours",
    status: "Status",
    funding: "Funding type",
    visa: "Visa eligibility",
    instruction:
      "You are the GrantKit AI assistant. The user is reading about one specific grant / organization. All of the organization's public details are given below — use them as your primary source before falling back on general knowledge. Be concrete and answer in 1–3 short paragraphs or bullet points. If the user asks about services, contact methods, eligibility or process, quote the relevant fact verbatim. Reply in the same language as the user question.\n\n{details}\n\nUser question: {message}",
  },
  ka: {
    grant: "გრანტი",
    organization: "ორგანიზაცია",
    location: "ლოკაცია",
    amount: "თანხა",
    deadline: "ვადა",
    website: "ვებსაიტი",
    category: "კატეგორია",
    eligibility: "ვინ შეიძლება მიმართოს",
    process: "განაცხადის პროცესი",
    diagnosis: "სამიზნე მდგომარეობები",
    age: "ასაკის დიაპაზონი",
    scope: "გეოგრაფიული დაფარვა",
    documents: "საჭირო დოკუმენტები",
    phone: "ტელეფონი",
    email: "ელფოსტა",
    address: "მისამართი",
    hours: "სამუშაო საათები",
    status: "სტატუსი",
    funding: "დაფინანსების ტიპი",
    visa: "ვიზის დასაშვებობა",
    instruction:
      "შენ ხარ GrantKit-ის AI ასისტენტი. მომხმარებელი კითხულობს კონკრეტული გრანტის/ორგანიზაციის შესახებ. ქვემოთ მოცემულია ყველა საჯარო ინფორმაცია ამ ორგანიზაციაზე — გამოიყენე ჯერ ეს წყარო და მხოლოდ მერე საერთო ცოდნა. უპასუხე 1-3 მოკლე აბზაცით ან bullet-ებით. თუ მომხმარებელი იკითხავს სერვისების, კონტაქტის, დასაშვებობის ან პროცესის შესახებ — ციტირებულად მოიტანე ფაქტი. უპასუხე იმ ენაზე, რომელზეც შეკითხვა მოვიდა.\n\n{details}\n\nმომხმარებლის შეკითხვა: {message}",
  },
  fr: {
    grant: "Subvention",
    organization: "Organisation",
    location: "Localisation",
    amount: "Montant",
    deadline: "Date limite",
    website: "Site web",
    category: "Catégorie",
    eligibility: "Qui peut postuler",
    process: "Processus de candidature",
    diagnosis: "Pathologies ciblées",
    age: "Tranche d'âge",
    scope: "Couverture géographique",
    documents: "Documents requis",
    phone: "Téléphone",
    email: "E-mail",
    address: "Adresse",
    hours: "Heures d'ouverture",
    status: "Statut",
    funding: "Type de financement",
    visa: "Éligibilité visa",
    instruction:
      "Vous êtes l'assistant IA de GrantKit. L'utilisateur consulte une subvention/organisation précise. Toutes les informations publiques sont ci-dessous — utilisez-les en priorité avant tout savoir général. Répondez en 1 à 3 courts paragraphes ou puces. Si la question porte sur les services, contacts, éligibilité ou processus, citez l'information verbatim. Répondez dans la langue de la question.\n\n{details}\n\nQuestion : {message}",
  },
  es: {
    grant: "Subvención",
    organization: "Organización",
    location: "Ubicación",
    amount: "Monto",
    deadline: "Fecha límite",
    website: "Sitio web",
    category: "Categoría",
    eligibility: "Quién puede solicitar",
    process: "Proceso de solicitud",
    diagnosis: "Condiciones objetivo",
    age: "Rango de edad",
    scope: "Alcance geográfico",
    documents: "Documentos requeridos",
    phone: "Teléfono",
    email: "Correo",
    address: "Dirección",
    hours: "Horario",
    status: "Estado",
    funding: "Tipo de financiación",
    visa: "Elegibilidad de visa",
    instruction:
      "Eres el asistente de IA de GrantKit. El usuario está leyendo sobre una subvención/organización específica. Toda la información pública está abajo — úsala como fuente principal antes del conocimiento general. Responde en 1–3 párrafos cortos o viñetas. Si preguntan por servicios, contacto, elegibilidad o proceso, cita la información verbatim. Responde en el idioma de la pregunta.\n\n{details}\n\nPregunta: {message}",
  },
  ru: {
    grant: "Грант",
    organization: "Организация",
    location: "Местоположение",
    amount: "Сумма",
    deadline: "Срок",
    website: "Веб-сайт",
    category: "Категория",
    eligibility: "Кто может подать",
    process: "Процесс подачи",
    diagnosis: "Целевые состояния",
    age: "Возрастной диапазон",
    scope: "География",
    documents: "Необходимые документы",
    phone: "Телефон",
    email: "Email",
    address: "Адрес",
    hours: "Часы работы",
    status: "Статус",
    funding: "Тип финансирования",
    visa: "Право по визе",
    instruction:
      "Ты — AI-ассистент GrantKit. Пользователь читает о конкретном гранте/организации. Ниже — вся публичная информация о ней: используй её как основной источник, прежде чем опираться на общие знания. Отвечай 1–3 короткими абзацами или пунктами списка. Если спрашивают об услугах, контактах, праве на подачу или процессе — цитируй дословно. Отвечай на языке вопроса.\n\n{details}\n\nВопрос: {message}",
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

export function buildGrantFocusContext(
  userMessage: string,
  grant: FocusedGrantContext,
  language = "en",
): string {
  const t = TEMPLATES[language] ?? TEMPLATES.en;

  const line = (emoji: string, label: string, value?: string | null) =>
    value && value.trim() ? `${emoji} ${label}: ${value.trim()}` : null;

  const details = [
    line("📋", t.grant, grant.name),
    line("🏢", t.organization, grant.organization),
    line("🏷️", t.category, grant.category),
    line("🚦", t.status, grant.status),
    line("📍", t.location, grant.country),
    line("🌐", t.scope, grant.geographicScope),
    line("🏠", t.address, grant.address),
    line("💰", t.amount, grant.amount),
    line("💼", t.funding, grant.fundingType),
    line("📅", t.deadline, grant.deadline),
    line("🎯", t.diagnosis, grant.targetDiagnosis),
    line("👥", t.age, grant.ageRange),
    line("🛂", t.visa, grant.b2VisaEligible),
    line("✅", t.eligibility, grant.eligibility),
    line("📝", t.process, grant.applicationProcess),
    line("📎", t.documents, grant.documentsRequired),
    line("☎️", t.phone, grant.phone),
    line("✉️", t.email, grant.email),
    line("🕒", t.hours, grant.officeHours),
    line("🔗", t.website, grant.website),
  ]
    .filter(Boolean)
    .join("\n");

  return t.instruction
    .replace("{details}", details)
    .replace("{message}", userMessage);
}
