/*
 * buildGrantFocusContext — enriches a user message with grant details
 * so the AI assistant responds in the context of a specific grant.
 *
 * Shared between AiAssistant page and GrantDetailPanel (Phase 6).
 */

import type { ParsedGrant } from "@/components/GrantCard";

export function buildGrantFocusContext(
  userMessage: string,
  grant: ParsedGrant,
): string {
  const details = [
    `📋 გრანტი: ${grant.name}`,
    grant.organization ? `🏢 ორგანიზაცია: ${grant.organization}` : null,
    grant.country ? `📍 ლოკაცია: ${grant.country}` : null,
    grant.amount ? `💰 თანხა: ${grant.amount}` : null,
    grant.deadline ? `📅 ვადა: ${grant.deadline}` : null,
    grant.website ? `🌐 ვებსაიტი: ${grant.website}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    `შენ ხარ GrantKit AI ასისტენტი. მომხმარებელი ამჟამად კითხულობს კონკრეტული გრანტის/ორგანიზაციის შესახებ:\n\n` +
    `${details}\n\n` +
    `უპასუხე მომხმარებლის შეკითხვას მხოლოდ ამ გრანტის/ორგანიზაციის კონტექსტში. ` +
    `თუ მომხმარებელი ისეთ რამეს ეკითხება, რაც ამ გრანტს არ ეხება, თავაზიანად შეახსენე რომ ფოკუსი ამ გრანტზეა ` +
    `და შესთავაზე ფოკუსის მოხსნა ზოგადი ძებნისთვის.\n\n${userMessage}`
  );
}
