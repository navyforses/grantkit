/*
 * Privacy Policy body — pure, provider-free so it can be rendered in a
 * node test for all 5 dictionaries. Layout chrome stays in pages/Privacy.tsx.
 */

import { Link } from "wouter";
import type { Translations } from "@/i18n/types";

export const PRIVACY_CONTACT_EMAIL = "hello@grantkit.co";

export default function PrivacyBody({ t }: { t: Translations }) {
  const l = t.legal;
  return (
    <div className="prose prose-sm md:prose-base prose-gray max-w-none prose-headings:text-foreground prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-headings:text-base md:prose-headings:text-xl prose-p:text-sm md:prose-p:text-base prose-li:text-sm md:prose-li:text-base">
      <h2>{l.privacyControllerTitle}</h2>
      <p>{l.privacyControllerText}</p>

      <h2>{l.privacyCollectTitle}</h2>
      <p>{l.privacyCollectIntro}</p>
      <ul>
        <li>{l.privacyCollectAccount}</li>
        <li>{l.privacyCollectOnboarding}</li>
        <li><strong>{l.privacyCollectStatus}</strong></li>
        <li>{l.privacyCollectQueries}</li>
        <li>{l.privacyCollectContact}</li>
      </ul>

      <h2>{l.privacyBasisTitle}</h2>
      <p>{l.privacyBasisText}</p>
      <p>{l.privacyBasisArt9}</p>

      <h2>{l.privacyRetentionTitle}</h2>
      <ul>
        <li>{l.privacyRetentionAccount}</li>
        <li>{l.privacyRetentionLogs}</li>
        <li>{l.privacyRetentionBrowser}</li>
      </ul>

      <h2>{l.privacyCookiesTitle}</h2>
      <p>{l.privacyCookiesText}</p>
      <p>{l.privacyCookiesStorage}</p>
      <p>{l.privacyCookiesNone}</p>

      <h2>{l.privacyThirdTitle}</h2>
      <p>{l.privacyThirdIntro}</p>
      <ul>
        <li>{l.privacyThirdRailway}</li>
        <li>{l.privacyThirdResend}</li>
        <li>{l.privacyThirdMaps}</li>
        <li>{l.privacyThirdAnthropic}</li>
        <li>{l.privacyThirdPaddle}</li>
      </ul>

      <h2>{l.privacyRightsTitle}</h2>
      <p>{l.privacyRightsText}</p>
      <ul>
        <li>{l.privacyRights1}</li>
        <li>{l.privacyRights2}</li>
        <li>{l.privacyRights3}</li>
        <li>{l.privacyRights4}</li>
        <li>{l.privacyRights5}</li>
        <li>{l.privacyRights6}</li>
      </ul>
      <p>{l.privacyRightsHow}</p>

      <h2>{l.privacyMoneyTitle}</h2>
      <p>{l.privacyMoneyText}</p>
      <p>
        <Link href="/trust" data-testid="privacy-trust-link">{l.privacyMoneyLink}</Link>
      </p>

      <h2>{l.privacyChangesTitle}</h2>
      <p>{l.privacyChangesText}</p>

      <h2>{l.privacyContactTitle}</h2>
      <p>
        {l.privacyContactText}{" "}
        <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}
