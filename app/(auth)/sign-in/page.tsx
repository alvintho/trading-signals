'use client'

import InputField from "@/components/forms/InputField";
import {Button} from "@/components/ui/button";
import FooterLink from "@/components/forms/FooterLink";
import {SubmitHandler, useForm} from "react-hook-form";
import {signInWithEmail} from "@/lib/actions/auth.actions";
import {toast} from "sonner";
import {useRouter} from "next/navigation";

const SignInPage = () => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur'
    });

    const onSubmit: SubmitHandler<SignInFormData> = async (data: SignInFormData) => {
        try {
            const result = await signInWithEmail(data);

            if (result.success) {
                router.push("/");
                return;
            }

            // Server action caught error and returned it
            toast.error('Sign in failed.', {
                description: result.error || 'Invalid credentials',
                descriptionClassName: "!text-red-300",
            });
        } catch (e) {
            // Handle critical/unexpected errors (e.g. network failure)
            console.error('Critical sign-in error:', e);
            toast.error('Sign in failed.', {
                description: 'A network error occurred. Please check your connection.',
                descriptionClassName: "!text-red-300",
            });
        }
    }

    return (
        <>
            <h1 className="form-title">Welcome Back</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="Email"
                    placeholder="contact@mail.com"
                    register={register}
                    error={errors.email}
                    validation={{ 
                        required: 'Email is required', 
                        pattern: {
                            value: /^\w+@\w+\.\w+$/,
                            message: 'Invalid email address'
                        }
                    }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: { value: 8, message: "Password must be at least 8 characters" } }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Signing In' : 'Sign In'}
                </Button>

                <FooterLink text="Don't have an account?" linkText="Create an account" href="/sign-up" />
            </form>
        </>
    )
}
export default SignInPage
