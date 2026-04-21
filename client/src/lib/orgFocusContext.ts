/*
 * buildOrgFocusContext — enriches a user message with organisation
 * details so the AI assistant responds in the context of one org.
 *
 * Mirrors `grantFocusContext.ts` but exposes the fields that matter
 * for an organisation page: name, address, phone, email, website,
 * service area, categories, and description. Used by OrgAiChat on the
 * /organizations/:orgId page.
 *
 * The system prompt in `server/grantAssistant.ts` already handles the
 * "user is reading about a specific grant/organisation" framing — this
 * helper just builds the context block.
 */

export interface OrgFocus {
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  serviceArea?: string | null;
  categories?: string | null;
}

interface PromptTemplate {
  organization: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  serviceArea: string;
  categories: string;
  instruction: string;
}

const TEMPLATES: Record<string, PromptTemplate> = {
  en: {
    organization: "Organization",
    description: "About",
    address: "Address",
    phone: "Phone",
    email: "Email",
    website: "Website",
    serviceArea: "Service area",
    categories: "Categories",
    instruction:
      "You are a GrantKit AI assistant. The user is on the detail page of a specific organisation:\n\n{details}\n\nAnswer the user's question only in the context of THIS organisation. When the user asks for facts not in the context (services, hours, programs, eligibility, contacts, news), call the `fetch_org_website` tool with the website URL above to read the organisation's own site. Always cite source URLs as markdown links.\n\nUser question:\n{message}",
  },
  ka: {
    organization: "ორგანიზაცია",
    description: "შესახებ",
    address: "მისამართი",
    phone: "ტელეფონი",
    email: "ელფოსტა",
    website: "ვებსაიტი",
    serviceArea: "მომსახურების ზონა",
    categories: "კატეგორიები",
    instruction:
      "შენ ხარ GrantKit AI ასისტენტი. მომხმარებელი იხილავს კონკრეტული ორგანიზაციის გვერდს:\n\n{details}\n\nუპასუხე მხოლოდ ამ ორგანიზაციის კონტექსტში. როცა მომხმარებელი ეკითხება ფაქტებს, რომლებიც კონტექსტში არ არის (სერვისები, საათები, პროგრამები, დახმარების პირობები, კონტაქტები, სიახლეები), გამოიძახე ხელსაწყო `fetch_org_website` ზემოთ მითითებული ვებსაიტის URL-ით და წაიკითხე თვით ორგანიზაციის საიტი. ყოველთვის მიუთითე წყაროს URL Markdown ბმულად.\n\nმომხმარებლის შეკითხვა:\n{message}",
  },
  fr: {
    organization: "Organisation",
    description: "À propos",
    address: "Adresse",
    phone: "Téléphone",
    email: "Email",
    website: "Site web",
    serviceArea: "Zone de service",
    categories: "Catégories",
    instruction:
      "Vous êtes un assistant IA GrantKit. L'utilisateur consulte la page d'une organisation spécifique :\n\n{details}\n\nRépondez uniquement dans le contexte de CETTE organisation. Si l'utilisateur demande des faits absents du contexte (services, horaires, programmes, éligibilité, contacts, actualités), appelez l'outil `fetch_org_website` avec l'URL du site ci-dessus pour lire le propre site de l'organisation. Citez toujours les URL sources sous forme de liens markdown.\n\nQuestion de l'utilisateur :\n{message}",
  },
  es: {
    organization: "Organización",
    description: "Acerca de",
    address: "Dirección",
    phone: "Teléfono",
    email: "Correo",
    website: "Sitio web",
    serviceArea: "Área de servicio",
    categories: "Categorías",
    instruction:
      "Eres un asistente de IA de GrantKit. El usuario está en la página de una organización específica:\n\n{details}\n\nResponde solo en el contexto de ESTA organización. Cuando el usuario pida datos que no están en el contexto (servicios, horarios, programas, requisitos, contactos, noticias), llama a la herramienta `fetch_org_website` con la URL del sitio web indicada arriba para leer el propio sitio de la organización. Cita siempre las URL de origen como enlaces markdown.\n\nPregunta del usuario:\n{message}",
  },
  ru: {
    organization: "Организация",
    description: "О ней",
    address: "Адрес",
    phone: "Телефон",
    email: "Эл. почта",
    website: "Веб-сайт",
    serviceArea: "Зона обслуживания",
    categories: "Категории",
    instruction:
      "Вы — AI-ассистент GrantKit. Пользователь находится на странице конкретной организации:\n\n{details}\n\nОтвечайте только в контексте ЭТОЙ организации. Если пользователь спрашивает о фактах, которых нет в контексте (услуги, часы работы, программы, условия, контакты, новости), вызовите инструмент `fetch_org_website` с указанным выше URL сайта, чтобы прочитать собственный сайт организации. Всегда указывайте источники в виде markdown-ссылок.\n\nВопрос пользователя:\n{message}",
  },
};

export function buildOrgFocusContext(
  userMessage: string,
  org: OrgFocus,
  language = "en",
): string {
  const t = TEMPLATES[language] ?? TEMPLATES.en;

  const locationParts = [org.city, org.state, org.country].filter(Boolean);
  const fullAddress = org.address
    ? [org.address, ...locationParts].join(", ")
    : locationParts.join(", ");

  const details = [
    `🏢 ${t.organization}: ${org.name}`,
    fullAddress ? `📍 ${t.address}: ${fullAddress}` : null,
    org.phone ? `📞 ${t.phone}: ${org.phone}` : null,
    org.email ? `✉️ ${t.email}: ${org.email}` : null,
    org.website ? `🌐 ${t.website}: ${org.website}` : null,
    org.serviceArea ? `🗺️ ${t.serviceArea}: ${org.serviceArea}` : null,
    org.categories ? `🏷️ ${t.categories}: ${org.categories}` : null,
    org.description ? `📝 ${t.description}: ${org.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return t.instruction
    .replace("{details}", details)
    .replace("{message}", userMessage);
}
