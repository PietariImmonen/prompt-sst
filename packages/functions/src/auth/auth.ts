import { issuer } from "@openauthjs/openauth";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";

import { handle } from "hono/aws-lambda";
import { Resource } from "sst/resource";
import { z } from "zod";

import { Account } from "@sst-replicache-template/core/domain/account";

import { User } from "@sst-replicache-template/core/domain/user";
import { appendSearchParams } from "@sst-replicache-template/core/lib/url";

import { subjects } from "./subjects";


// Default language to use when we can't access the request
const DEFAULT_LANGUAGE = "en";

const app = issuer({
  subjects,
  providers: {
    google: GoogleProvider({
      clientID: Resource.GoogleClientID.value,
      clientSecret: Resource.GoogleClientSecret.value,
      scopes: ["openid", "email", "profile"],
    }),
    // code: CodeProvider({
    //   length: 6,
    //   sendCode: async (claims, code) => {
    //     const email = claims.email;
    //     const locale = claims.locale ? claims.locale : DEFAULT_LANGUAGE;

    //     if (!email) {
    //       return {
    //         type: "invalid_claim",
    //         key: "email",
    //         value: "no_email",
    //       };
    //     }

    //     const account = await Account.fromEmail(email);
    //     // We don't have direct access to the request here, so use default language
    //     const language = locale;

    //     if (!account && claims.name) {
    //       await Account.create({
    //         email,
    //         name: claims.name,
    //         emailLanguage: language,
    //       });
    //     } else if (!account) {
    //       const user = await User.fromPublicEmail(email);
    //       if (!user) {
    //         return {
    //           type: "invalid_claim",
    //           key: "account",
    //           value: "no_account",
    //         };
    //       }

    //       // user has user but no account which means that the
    //       // user has been invited but not yet created an account

    //       await Account.create({
    //         email: user.email,
    //         name: user.name,
    //         emailLanguage: language,
    //       });
    //     }

    //     console.log("sending email to", email);
    //     console.log("Code", code);
    //     await Email.sendCode({ code, email });
    //   },
    //   request: async (req, state, form, error) => {
    //     const url = new URL(req.headers.get("Referer") || "");
    //     url.pathname = `/auth/${state.type}`;

    //     if (error) {
    //       url.pathname =
    //         error.type === "invalid_claim" ? "/auth/login" : url.pathname;
    //       url.searchParams.set(
    //         "error",
    //         error.type === "invalid_claim" ? error.value : error.type,
    //       );
    //       url.searchParams.set("timestamp", Date.now().toString());
    //     }

    //     if (state.type === "code") {
    //       url.searchParams.set("email", form?.get("email")?.toString() ?? "");
    //     }

    //     if (form?.get("action") === "resend") {
    //       url.searchParams.set("redirect", "new_code");
    //       url.searchParams.set("timestamp", Date.now().toString());
    //     }

    //     return new Response(null, {
    //       status: 302,
    //       headers: { Location: url.toString() },
    //     });
    //   },
    // }),
    // password: PasswordProvider({
    //   login: async (req, form, error) => {
    //     const email = form?.get("email")?.toString();

    //     if (!email) {
    //       return new Response(null, { status: 400 });
    //     }

    //     if (error) {
    //       const url = new URL(req.headers.get("Referer") || "");

    //       url.pathname = "/auth/login";
    //       url.searchParams.set("error", "invalid_claims");
    //       url.searchParams.set("timestamp", Date.now().toString());

    //       return new Response(null, {
    //         status: 302,
    //         headers: { Location: url.toString() },
    //       });
    //     }

    //     const account = await Account.fromEmail(email);
    //     const language = getLanguageFromHeader(req);

    //     if (!account) {
    //       await Account.create({
    //         email,
    //         name: email,
    //         emailLanguage: language,
    //       });
    //     }

    //     return new Response(null, { status: 200 });
    //   },
    //   register: async () => {
    //     return new Response(null, { status: 200 });
    //   },
    //   change: async () => {
    //     return new Response(null, { status: 200 });
    //   },
    //   sendCode: async () => {},
    // }),
  },
  success: async (ctx, value) => {
    const redirectNoAccount = () =>
      new Response("", {
        status: 302,
        headers: {
          Location: appendSearchParams({
            url: process.env.AUTH_APP_URL! + "/auth/login",
            searchParams: new URLSearchParams({
              error: "no_account",
              timestamp: new Date().getTime().toString(),
            }),
          }),
        },
      });

    // if (value.provider === "password") {
    //   const account = await Account.fromEmail(value.email);

    //   if (!account) {
    //     return redirectNoAccount();
    //   }

    //   return ctx.subject("account", {
    //     accountID: account.id,
    //     email: account.email,
    //     name: account.name,
    //   });
    // }

    if (value.provider === "google") {
      const access = value.tokenset.access;
      const response = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${access}`,
            Accept: "application/json",
          },
        },
      );

      const body = await response.json();
      const data = z
        .object({
          name: z.string(),
          email: z.string(),
          locale: z.string().optional(),
        })
        .safeParse(body);

      if (!data.success) {
        throw new Error("no_email_or_name");
      }

      const { email, name, locale } = data.data;
      const language = locale ? locale.split("-")[0] : DEFAULT_LANGUAGE;

      let account = await Account.fromEmail(email);

      if (!account) {
        const user = await User.fromPublicEmail(email);
        const accountID = await Account.create({
          email: user?.email || email,
          name: name,
          emailLanguage: language,
        });
        account = await Account.fromID(accountID);
      }

      return ctx.subject("account", {
        accountID: account!.id,
        email: account!.email,
        name: account!.name,
      });
    }

    if (value.provider === "microsoft") {
      const access = value.tokenset.access;
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${access}`,
          Accept: "application/json",
        },
      });

      const body = await response.json();

      const data = z
        .object({
          displayName: z.string(),
          mail: z.string(),
          preferredLanguage: z.string().optional(),
        })
        .safeParse(body);

      if (!data.success) {
        throw new Error("no_email_or_name");
      }

      const { mail: email, displayName: name, preferredLanguage } = data.data;
      const language = preferredLanguage
        ? preferredLanguage.split("-")[0]
        : DEFAULT_LANGUAGE;

      let account = await Account.fromEmail(email);

      if (!account) {
        const user = await User.fromPublicEmail(email);
        const accountID = await Account.create({
          email: user?.email || email,
          name: name,
          emailLanguage: language,
        });
        account = await Account.fromID(accountID);
      }

      return ctx.subject("account", {
        accountID: account!.id,
        email: account!.email,
        name: account!.name,
      });
    }

    // if (value.provider === "code") {
    //   const email = value.claims.email;

    //   if (!email) throw new Error("no_email");

    //   const account = await Account.fromEmail(email);

    //   if (!account) {
    //     return redirectNoAccount();
    //   }

    //   return ctx.subject("account", {
    //     accountID: account.id,
    //     email: email,
    //     name: account.name,
    //   });
    // }

    throw new Error("invalid_provider");
  },
});

export const handler = handle(app);
