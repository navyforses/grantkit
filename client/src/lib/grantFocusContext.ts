/*
 * buildGrantFocusContext — enriches a user message with grant details
 * so the AI assistant responds in the context of a specific grant.
 *
 * Shared between AiAssistant page and GrantDetailPanel (Phase 6).
 * Accepts a language code so the system prompt matches the user's locale.
 * Falls back to English — LLMs handle English instructions most reliably.
 */

import type { ParsedGrant } from "@/components/GrantCard";

// ── Per-language prompt templates ────────────────────────────────────────────

interface PromptTemplate {
  grant: string;
  organization: string;
  location: string;
  amount: string;
  deadline: string;
  website: string;
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
    instruction:
      "You are a GrantKit AI assistant. The user is currently reading about a specific grant/organization:\n\n{details}\n\nAnswer the user's question only in the context of this grant/organization. If the user asks about something unrelated, politely remind them that the focus is on this grant and suggest removing the focus for a general search.\n\n{message}",
  },
  ka: {
    grant: "გრანტი",
    organization: "ორგანიზაცია",
    location: "ლოკაცია",
    amount: "თანხა",
    deadline: "ვადა",
    website: "ვებსაიტი",
    instruction:
      "შენ ხარ GrantKit AI ასისტენტი. მომხმარებელი ამჟამად კითხულობს კონკრეტული გრანტის/ორგანიზაციის შესახებ:\n\n{details}\n\nუპასუხე მომხმარებლის შეკითხვას მხოლოდ ამ გრანტის/ორგანიზაციის კონტექსტში. თუ მომხმარებელი ისეთ რამეს ეკითხება, რაც ამ გრანტს არ ეხება, თავაზიანად შეახსენე რომ ფოკუსი ამ გრანტზეა და შესთავაზე ფოკუსის მოხსნა ზოგადი ძებნისთვის.\n\n{message}",
  },
  fr: {
    grant: "Subvention",
    organization: "Organisation",
    location: "Localisation",
    amount: "Montant",
    deadline: "Date limite",
    website: "Site web",
    instruction:
      "Vous êtes un assistant IA GrantKit. L'utilisateur consulte actuellement une subvention/organisation spécifique :\n\n{details}\n\nRépondez à la question de l'utilisateur uniquement dans le contexte de cette subvention/organisation. Si l'utilisateur pose une question sans rapport, rappelez-lui poliment que le focus est sur cette subvention et suggérez de retirer le focus pour une recherche générale.\n\n{message}",
  },
  es: {
    grant: "Subvención",
    organization: "Organización",
    location: "Ubicación",
    amount: "Monto",
    deadline: "Fecha límite",
    website: "Sitio web",
    instruction:
      "Eres un asistente de IA de GrantKit. El usuario está leyendo sobre una subvención/organización específica:\n\n{details}\n\nResponde a la pregunta del usuario solo en el contexto de esta subvención/organización. Si el usuario pregunta algo no relacionado, recuérdale amablemente que el enfoque está en esta subvención y sugiere quitar el enfoque para una búsqueda general.\n\n{message}",
  },
  ru: {
    grant: "Грант",
    organization: "Организация",
    location: "Местоположение",
    amount: "Сумма",
    deadline: "Срок",
    website: "Веб-сайт",
    instruction:
      "Вы — AI-ассистент GrantKit. Пользователь сейчас читает о конкретном гранте/организации:\n\n{details}\n\nОтвечайте на вопрос пользователя только в контексте этого гранта/организации. Если пользователь спрашивает о чём-то не связанном, вежливо напомните, что фокус на этом гранте, и предложите снять фокус для общего поиска.\n\n{message}",
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

export function buildGrantFocusContext(
  userMessage: string,
  grant: ParsedGrant,
  language = "en",
): string {
  const t = TEMPLATES[language] ?? TEMPLATES.en;

  const details = [
    `📋 ${t.grant}: ${grant.name}`,
    grant.organization ? `🏢 ${t.organization}: ${grant.organization}` : null,
    grant.country ? `📍 ${t.location}: ${grant.country}` : null,
    grant.amount ? `💰 ${t.amount}: ${grant.amount}` : null,
    grant.deadline ? `📅 ${t.deadline}: ${grant.deadline}` : null,
    grant.website ? `🌐 ${t.website}: ${grant.website}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return t.instruction
    .replace("{details}", details)
    .replace("{message}", userMessage);
}
