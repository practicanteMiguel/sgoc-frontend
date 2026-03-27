import { Suspense } from "react";
import { VerifyEmailView } from "@/src/components/auth/verify-email-view";

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailView />
        </Suspense>
    );
}