
/* STILLWORD AUTHENTICATION
   Firebase Authentication */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";


/* FIREBASE CONFIGURATION */

const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId"
];

const isConfigured = requiredFields.every((field) => {
    const value = firebaseConfig[field];

    return (
        typeof value === "string" &&
        value.trim() !== "" &&
        !value.startsWith("YOUR_") &&
        !value.startsWith("PASTE_")
    );
});

const body = document.body;

const pageType = body.dataset.authPage || "";

const requiresAuthentication =
    body.dataset.authRequired === "true";

const allowedPages = [
    "home.html",
    "books.html",
    "search.html",
    "saved.html",
    "journal.html"
];


/* HELPER FUNCTIONS */

function showMessage(elementId, message, isError = false) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.classList.toggle("is-error", isError);
    element.classList.toggle("is-success", !isError && Boolean(message));
}


function getRedirectPage() {

    const params = new URLSearchParams(window.location.search);

    const requested = params.get("redirect");

    return allowedPages.includes(requested)
        ? requested
        : "books.html";
}


function showConfigurationError() {

    const message =
        "Firebase is not connected yet. Please configure firebase-config.js.";

    if (pageType === "login") {
        showMessage("login-message", message, true);
    }

    if (pageType === "signup") {
        showMessage("signup-message", message, true);
    }

    const loader = document.getElementById("auth-loading");

    if (requiresAuthentication && loader) {
        loader.textContent = message;
    }
}


function redirectToLogin() {

    const currentPage =
        window.location.pathname.split("/").pop();

    const destination = allowedPages.includes(currentPage)
        ? currentPage
        : "books.html";

    window.location.replace(
        `login.html?redirect=${encodeURIComponent(destination)}`
    );
}


function loadScript(source) {

    return new Promise((resolve, reject) => {

        const script = document.createElement("script");

        script.src = source;
        script.async = false;

        script.onload = resolve;

        script.onerror = () => {
            reject(new Error(`Unable to load ${source}`));
        };

        document.body.appendChild(script);

    });
}


function getFriendlyError(error) {

    const messages = {

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/user-not-found":
            "No account found with that email.",

        "auth/wrong-password":
            "Incorrect email or password.",

        "auth/invalid-credential":
            "Incorrect email or password.",

        "auth/email-already-in-use":
            "This email is already registered.",

        "auth/weak-password":
            "Your password must contain at least 6 characters.",

        "auth/too-many-requests":
            "Too many attempts. Please try again later.",

        "auth/network-request-failed":
            "Network error. Check your internet connection."
    };

    return messages[error.code] ||
        "Something went wrong. Please try again.";
}


/* NAVIGATION */

let auth;

function updateNavigation(user) {

    const container =
        document.getElementById("auth-nav-actions");

    if (!container) return;

    container.replaceChildren();

    if (!user) {

        const loginLink = document.createElement("a");

        loginLink.href = "login.html";
        loginLink.textContent = "Log in";
        loginLink.className = "auth-nav-link";

        const signupLink = document.createElement("a");

        signupLink.href = "signup.html";
        signupLink.textContent = "Sign up";
        signupLink.className = "auth-nav-button";

        container.append(loginLink, signupLink);

        return;
    }

    const email = document.createElement("span");

    email.textContent = user.email || "Signed in";
    email.className = "auth-user-email";

    const logoutButton = document.createElement("button");

    logoutButton.type = "button";
    logoutButton.textContent = "Log out";
    logoutButton.className = "auth-logout-button";
    logoutButton.dataset.logout = "true";

    container.append(email, logoutButton);
}


/* LOGIN */

const loginForm = document.getElementById("login-form");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("login-email").value.trim();

        const password =
            document.getElementById("login-password").value;

        const button =
            loginForm.querySelector("button[type='submit']");

        button.disabled = true;

        showMessage("login-message", "");

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            window.location.replace(getRedirectPage());

        } catch (error) {

            console.error("Login error:", error);

            showMessage(
                "login-message",
                getFriendlyError(error),
                true
            );

            button.disabled = false;

        }

    });

}


/* SIGN UP */

const signupForm = document.getElementById("signup-form");

if (signupForm) {

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("signup-email").value.trim();

        const password =
            document.getElementById("signup-password").value;

        const confirmPassword =
            document.getElementById("signup-confirm-password").value;

        const button =
            signupForm.querySelector("button[type='submit']");

        if (password !== confirmPassword) {

            showMessage(
                "signup-message",
                "Passwords do not match.",
                true
            );

            return;
        }

        button.disabled = true;

        showMessage("signup-message", "");

        try {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            window.location.replace("books.html");

        } catch (error) {

            console.error("Sign up error:", error);

            showMessage(
                "signup-message",
                getFriendlyError(error),
                true
            );

            button.disabled = false;

        }

    });

}


/* FORGOT PASSWORD */

const forgotPasswordButton =
    document.getElementById("forgot-password");

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener("click", async () => {

        const email =
            document.getElementById("login-email").value.trim();

        if (!email) {

            showMessage(
                "login-message",
                "Enter your email address first.",
                true
            );

            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            showMessage(
                "login-message",
                "Password reset instructions have been sent."
            );

        } catch (error) {

            showMessage(
                "login-message",
                getFriendlyError(error),
                true
            );

        }

    });

}


/* LOG OUT */

document.addEventListener("click", async (event) => {

    const button = event.target.closest("[data-logout]");

    if (!button) return;

    button.disabled = true;

    try {

        await signOut(auth);

        window.location.replace("index.html");

    } catch (error) {

        console.error("Logout error:", error);

        button.disabled = false;

        alert("Unable to log out. Please try again.");

    }

});


/* CHECK FIREBASE CONFIGURATION */

if (!isConfigured) {

    showConfigurationError();

} else {

    const app = initializeApp(firebaseConfig);

    auth = getAuth(app);

    window.stillwordAuth = auth;

    let scriptsLoaded = false;

    onAuthStateChanged(auth, async (user) => {

        updateNavigation(user);

        /* Protect Bible application pages */

        if (requiresAuthentication) {

            if (!user) {

                redirectToLogin();

                return;
            }

            if (scriptsLoaded) return;

            scriptsLoaded = true;

            document.body.classList.remove("auth-pending");

            document.getElementById("auth-loading")?.remove();

            try {

                await loadScript("script.js");

                if (pageType === "books") {

                    await loadScript("chapter-scroll.js");

                }

            } catch (error) {

                console.error("Page loading error:", error);

            }

            return;
        }

        /* Redirect logged-in users away from login/signup */

        if (
            (pageType === "login" || pageType === "signup") &&
            user
        ) {

            window.location.replace(getRedirectPage());

        }

    });

}
