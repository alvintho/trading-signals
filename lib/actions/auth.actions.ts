'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: { email, password, name: fullName },
        })

        if (response) {
            await inngest.send({ // trigger background job via inngest to process additional user data and onboarding workflows
                name: 'app/user.created',
                data: {
                    email,
                    name: fullName,
                    country,
                    investmentGoals,
                    riskTolerance,
                    preferredIndustry
                }
            })
        }

        return { success: true, data: response }

    } catch (e: unknown) {
        const internalMessage = e instanceof Error ? e.message : '';
        console.error('Sign Up failed', { internalMessage: internalMessage || 'Unknown error' });
        return { success: false, error: internalMessage || 'Sign Up Failed' };
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            body: { email, password},
        })
        return { success: true, data: response }
    } catch (e: unknown) {
        const internalMessage = e instanceof Error ? e.message : '';
        console.error('Sign In failed', { internalMessage: internalMessage || 'Unknown error' })
        return { success: false, error: internalMessage || 'Sign In Failed' };
    }
}

// better-auth reads the session token from the httpOnly cookie
// and remove the session from MongoDB session collection, clear out all auth logic
// and invalidates the session thus logging out
export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign Out failed', e);
        return { success: false, error: 'Sign Out Failed' };
    }
}