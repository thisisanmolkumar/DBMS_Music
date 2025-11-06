import { FormEvent, MouseEvent, useCallback, useEffect, useState } from "react";
import styles from "./Login.module.css";
import logo from "../../logo.svg";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { styled } from "@mui/material/styles";
import { IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useAuth } from "../../auth/AuthContext";
import { API_BASE_URL } from "../../config/api";

type LoginDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

const CustomTextField = styled(({ slotProps, ...props }: TextFieldProps) => {
    const mergedSlotProps = {
        ...slotProps,
        input: {
            disableUnderline: true,
            ...(slotProps?.input ?? {}),
        },
    };

    return <TextField {...props} slotProps={mergedSlotProps} />;
})(({ theme }) => ({
    "& label": {
        color: "#6e6e73",
        paddingLeft: 8,
    },
    "& label.Mui-focused": {
        color: "#188c90",
    },
    "& .MuiFilledInput-root": {
        minWidth: "500px",
        overflow: "hidden",
        color: "#ffffff",
        paddingLeft: 6,
        borderRadius: 15,
        border: "1px solid",
        backgroundColor: "#ffffff0a",
        borderColor: "#6e6e73",
        transition: theme.transitions.create([
            "border-color",
            "background-color",
        ]),
        "&.Mui-focused": {
            backgroundColor: "transparent",
            borderColor: "#188c90",
        },
    },
}));

const LoginDialog = ({ isOpen, onClose }: LoginDialogProps) => {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [validated, setValidated] = useState(false);
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const { user, login, logout } = useAuth();

    const checkEmail = useCallback((value: string) => {
        const normalized = value.trim();
        if (!normalized) {
            setEmailError("Email is required.");
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailPattern.test(normalized);
        setEmailError(isValid ? null : "Enter a valid email.");
        return isValid;
    }, []);

    useEffect(() => {
        checkEmail(email);
    }, [email, checkEmail]);

    useEffect(() => {
        if (!email) {
            setValidated(false);
            return;
        }
        setValidated(emailError === null);
    }, [email, emailError]);

    useEffect(() => {
        if (!isOpen) {
            setEmail("");
            setPassword("");
            setUsername("");
            setLoginError(null);
            setEmailError(null);
            setValidated(false);
            setIsSubmitting(false);
            setIsRegistering(false);
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (user) {
            logout();
            onClose();
            return;
        }

        setLoginError(null);
        const trimmedEmail = email.trim();
        const wasValidated = validated;
        setEmail(trimmedEmail);
        const emailIsValid = checkEmail(trimmedEmail);
        setValidated(emailIsValid);
        if (!emailIsValid) {
            return;
        }

        if (!password) {
            if (wasValidated) {
                setLoginError("Password is required.");
            }
            return;
        }

        try {
            setIsSubmitting(true);

            if (isRegistering) {
                const trimmedUsername = username.trim();
                if (!trimmedUsername) {
                    setLoginError("Username is required.");
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: trimmedUsername,
                        email: trimmedEmail,
                        password,
                    }),
                });

                const data: { error?: string } | null = await response
                    .json()
                    .catch(() => null);

                if (!response.ok) {
                    setLoginError(
                        data?.error ??
                            "Unable to create the account. Please try again."
                    );
                    return;
                }

                const loginResult = await login(trimmedEmail, password);
                if (!loginResult.ok) {
                    setLoginError(
                        loginResult.error ??
                            "Account created, but automatic sign-in failed."
                    );
                    return;
                }

                onClose();
                return;
            } else {
                const result = await login(trimmedEmail, password);
                if (result.ok) {
                    onClose();
                    return;
                }

                setLoginError(result.error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div
                className={styles.card}
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-title"
                aria-describedby="login-subtitle"
            >
                <IconButton
                    size="small"
                    onClick={onClose}
                    className={styles.closeButton}
                >
                    <CloseRoundedIcon />
                </IconButton>
                <header className={styles.header}>
                    <img src={logo} className={styles.logo_icon} alt="logo" />
                    <div>
                        <h1 className={styles.title} id="login-title">
                            {user ? "Leaving so soon?" : "Continue with email"}
                        </h1>
                        {user === null && (
                            <p className={styles.subtitle} id="login-subtitle">
                                You can sign in if you already have an account,
                                or we'll help you create one.
                            </p>
                        )}
                    </div>
                </header>
                <form className={styles.form} onSubmit={handleSubmit}>
                    {user === null && (
                        <CustomTextField
                            label="Email"
                            variant="filled"
                            type="email"
                            value={email}
                            onChange={(event) => {
                                const value = event.target.value;
                                setEmail(value);
                                if (loginError) {
                                    setLoginError(null);
                                }
                                if (emailError) {
                                    checkEmail(value);
                                }
                            }}
                            onBlur={(event) => {
                                checkEmail(event.target.value);
                            }}
                            error={Boolean(emailError)}
                            helperText={emailError ?? " "}
                            disabled={isSubmitting}
                        />
                    )}
                    {user === null && isRegistering && (
                        <CustomTextField
                            label="Username"
                            variant="filled"
                            type="text"
                            value={username}
                            onChange={(event) => {
                                setUsername(event.target.value);
                                if (loginError) {
                                    setLoginError(null);
                                }
                            }}
                            disabled={isSubmitting}
                        />
                    )}
                    {user === null && validated && (
                        <CustomTextField
                            label="Password"
                            variant="filled"
                            type="password"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                if (loginError) {
                                    setLoginError(null);
                                }
                            }}
                            disabled={isSubmitting}
                        />
                    )}
                    {loginError && (
                        <p className={styles.errorMessage} role="alert">
                            {loginError}
                        </p>
                    )}
                    <button
                        className={styles.submitButton}
                        type="submit"
                        disabled={
                            isSubmitting ||
                            (!user &&
                                (email.trim().length === 0 ||
                                    Boolean(emailError) ||
                                    password.length === 0))
                        }
                        aria-busy={isSubmitting}
                    >
                        {isSubmitting
                            ? isRegistering
                                ? "Creating account..."
                                : "Signing in..."
                            : user
                            ? "Log out"
                            : isRegistering
                            ? "Create account"
                            : "Continue"}
                    </button>
                </form>
                {user === null && (
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => {
                            setIsRegistering((prev) => !prev);
                            setLoginError(null);
                        }}
                        disabled={isSubmitting}
                    >
                        {isRegistering
                            ? "Have an account? Sign in"
                            : "Need an account? Register"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default LoginDialog;
