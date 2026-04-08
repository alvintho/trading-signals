import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// vi.mock factories are hoisted before variable declarations, so we use
// vi.hoisted() to create mock functions that are available in factory scope.
// ---------------------------------------------------------------------------

const { mockPush, mockToastError, mockSignUpWithEmail } = vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockToastError: vi.fn(),
    mockSignUpWithEmail: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}));

vi.mock('@/lib/actions/auth.actions', () => ({
    signUpWithEmail: (...args: unknown[]) => mockSignUpWithEmail(...args),
}));

vi.mock('@/components/forms/InputField', () => ({
    default: ({ name, label, placeholder, type = 'text', register, error, validation }: {
        name: string;
        label: string;
        placeholder: string;
        type?: string;
        register: (name: string, validation?: unknown) => { ref: React.Ref<HTMLInputElement>; [key: string]: unknown };
        error?: { message?: string };
        validation?: unknown;
    }) => {
        const { ref, ...rest } = register(name, validation);
        return (
            <div>
                <label htmlFor={name}>{label}</label>
                <input id={name} name={name} placeholder={placeholder} type={type} ref={ref} {...rest} />
                {error && <p>{error.message}</p>}
            </div>
        );
    },
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: { children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/forms/FooterLink', () => ({
    default: ({ text, linkText, href }: { text: string; linkText: string; href: string }) => (
        <a href={href}>{text} {linkText}</a>
    ),
}));

// SelectField and CountrySelectField use react-hook-form Controller internally — mock them
// so the sign-up form renders without a real Select/Country library
vi.mock('@/components/forms/SelectField', () => ({
    default: ({ name, label, options, error }: {
        name: string;
        label: string;
        options: { value: string; label: string }[];
        control: unknown;
        error?: { message?: string };
    }) => (
        <div>
            <label htmlFor={name}>{label}</label>
            <select id={name} name={name}>
                {options.map((o: { value: string; label: string }) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            {error && <p>{error.message}</p>}
        </div>
    ),
}));

vi.mock('@/components/forms/CountrySelectField', () => ({
    CountrySelectField: ({ name, label, error }: {
        name: string;
        label: string;
        error?: { message?: string };
    }) => (
        <div>
            <label htmlFor={name}>{label}</label>
            <select id={name} name={name}>
                <option value="US">United States</option>
            </select>
            {error && <p>{error.message}</p>}
        </div>
    ),
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import SignUpPage from '@/app/(auth)/sign-up/page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fill out the minimum required text fields to make the form submittable. */
const fillRequiredFields = async (
    overrides: Partial<{
        fullName: string;
        email: string;
        password: string;
        confirmPassword: string;
    }> = {},
) => {
    const user = userEvent.setup();
    const values = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'secure123',
        confirmPassword: 'secure123',
        ...overrides,
    };

    await user.type(screen.getByLabelText('Full Name'), values.fullName);
    await user.type(screen.getByLabelText('Email'), values.email);
    await user.type(screen.getByLabelText('Password'), values.password);
    await user.type(screen.getByLabelText('Confirm Password'), values.confirmPassword);
    return user;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignUpPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all expected form fields including the new Confirm Password field', () => {
        render(<SignUpPage />);
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('initialises Confirm Password with an empty string', () => {
        render(<SignUpPage />);
        expect(screen.getByLabelText('Confirm Password')).toHaveValue('');
    });

    // -----------------------------------------------------------------------
    // onSubmit – success path
    // -----------------------------------------------------------------------

    it('redirects to "/" when signUpWithEmail returns success:true', async () => {
        mockSignUpWithEmail.mockResolvedValueOnce({ success: true });

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
        expect(mockToastError).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // onSubmit – server-returned failure
    // -----------------------------------------------------------------------

    it('shows toast with result.error when signUpWithEmail returns success:false with an error string', async () => {
        mockSignUpWithEmail.mockResolvedValueOnce({ success: false, error: 'Email already exists' });

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign up failed.',
                expect.objectContaining({ description: 'Email already exists' }),
            );
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('falls back to "Failed to create an account" when result.error is undefined', async () => {
        mockSignUpWithEmail.mockResolvedValueOnce({ success: false, error: undefined });

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign up failed.',
                expect.objectContaining({ description: 'Failed to create an account' }),
            );
        });
    });

    it('applies descriptionClassName "!text-red-300" to the server-error toast', async () => {
        mockSignUpWithEmail.mockResolvedValueOnce({ success: false, error: 'Some error' });

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign up failed.',
                expect.objectContaining({ descriptionClassName: '!text-red-300' }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // onSubmit – network / unexpected error (thrown exception)
    // -----------------------------------------------------------------------

    it('shows network error toast when signUpWithEmail throws', async () => {
        mockSignUpWithEmail.mockRejectedValueOnce(new Error('fetch failed'));

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign up failed.',
                expect.objectContaining({
                    description: 'A network error occurred. Please check your connection.',
                }),
            );
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('applies descriptionClassName "!text-red-300" to the network-error toast', async () => {
        mockSignUpWithEmail.mockRejectedValueOnce(new Error('timeout'));

        render(<SignUpPage />);
        await fillRequiredFields();
        await userEvent.setup().click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign up failed.',
                expect.objectContaining({ descriptionClassName: '!text-red-300' }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // confirmPassword validation
    // -----------------------------------------------------------------------

    it('shows "Confirm password is required" when confirmPassword is left empty', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        const confirmInput = screen.getByLabelText('Confirm Password');
        await user.click(confirmInput);
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Confirm password is required')).toBeInTheDocument();
        });
    });

    it('shows "Password does not match" when confirmPassword differs from password', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Password'), 'correct_pass');
        await user.type(screen.getByLabelText('Confirm Password'), 'different_pass');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Password does not match')).toBeInTheDocument();
        });
    });

    it('does not show a mismatch error when confirmPassword matches password', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Password'), 'matching123');
        await user.type(screen.getByLabelText('Confirm Password'), 'matching123');
        await user.tab();

        await waitFor(() => {
            expect(screen.queryByText('Password does not match')).not.toBeInTheDocument();
        });
    });

    it('revalidates confirmPassword when the password field changes and they no longer match', async () => {
        const user = userEvent.setup();
        mockSignUpWithEmail.mockResolvedValue({ success: true });
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Password'), 'pass1234');
        await user.type(screen.getByLabelText('Confirm Password'), 'pass1234');
        // Now change password to something different and submit → confirm error should appear
        await user.clear(screen.getByLabelText('Password'));
        await user.type(screen.getByLabelText('Password'), 'pass9999');
        await user.click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(screen.getByText('Password does not match')).toBeInTheDocument();
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Email validation
    // -----------------------------------------------------------------------

    it('shows "Email is required" when email is left empty on blur', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.click(screen.getByLabelText('Email'));
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });
    });

    it('shows "Invalid email address" for a malformed email', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Email'), 'not-valid');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Invalid email address')).toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Password validation
    // -----------------------------------------------------------------------

    it('shows "Password must be at least 8 characters" for a short password', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Password'), 'short');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        });
    });

    it('accepts a password of exactly 8 characters', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        await user.type(screen.getByLabelText('Password'), '12345678');
        await user.tab();

        await waitFor(() => {
            expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Does not call server action when form has validation errors
    // -----------------------------------------------------------------------

    it('does not call signUpWithEmail when form has validation errors', async () => {
        const user = userEvent.setup();
        render(<SignUpPage />);

        // Submit without filling anything
        await user.click(screen.getByRole('button', { name: /start your investing journey/i }));

        await waitFor(() => {
            expect(screen.getByText('Full name is required')).toBeInTheDocument();
        });
        expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });
});