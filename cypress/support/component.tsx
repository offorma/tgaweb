// next/link and other Next internals read process.env.* in the browser bundle.
// Vite doesn't define `process`, so shim it before anything imports next/link.
(globalThis as any).process = (globalThis as any).process ?? { env: {} };
if (!(globalThis as any).process.env) (globalThis as any).process.env = {};

import { mount } from "cypress/react";
import { NextIntlClientProvider } from "next-intl";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import messages from "../../messages/en.json";

// Collect code coverage when CYPRESS_COVERAGE=true (no-op otherwise).
import "@cypress/code-coverage/support";

// A no-op App Router so components using next/link or next/navigation hooks
// (useRouter / usePathname / useSearchParams) mount without the real Next runtime.
// Created per-mount (inside a test) so cy.stub() is valid.
function withNextProviders(component: React.ReactNode, pathname = "/") {
  const stubRouter = {
    push: cy.stub().as("router:push"),
    replace: cy.stub().as("router:replace"),
    refresh: cy.stub().as("router:refresh"),
    prefetch: cy.stub().resolves(),
    back: cy.stub().as("router:back"),
    forward: cy.stub().as("router:forward"),
  } as any;
  return (
    <AppRouterContext.Provider value={stubRouter}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={new URLSearchParams() as any}>
          {component}
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

// Plain mount, but with the Next App Router context so next/link works.
Cypress.Commands.add("mount", (component: React.ReactNode) =>
  mount(withNextProviders(component))
);

/**
 * Mount a component that uses next-intl's useTranslations(), wrapped in a real
 * NextIntlClientProvider (English messages) AND the Next App Router context.
 *   cy.mountWithIntl(<Navbar settings={settings} />)
 */
Cypress.Commands.add("mountWithIntl", (component: React.ReactNode, locale = "en") =>
  mount(
    withNextProviders(
      <NextIntlClientProvider locale={locale} messages={messages as Record<string, unknown>}>
        {component}
      </NextIntlClientProvider>
    )
  )
);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount(component: React.ReactNode): ReturnType<typeof mount>;
      mountWithIntl(component: React.ReactNode, locale?: string): ReturnType<typeof mount>;
    }
  }
}
