"use strict";

/* Shared navigation: highlight the page currently being viewed. */
(function setActiveNavigation() {
    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".main-nav a[data-page]").forEach((link) => {
        const isCurrent = link.dataset.page === currentFile;
        link.classList.toggle("active", isCurrent);
        if (isCurrent) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
})();


/*  STILLWORD - HOME PAGE */

const dailyVerseElement = document.getElementById("daily-verse");
const referenceElement = document.getElementById("verse-reference");
const errorElement = document.getElementById("verse-error");
const refreshButton = document.getElementById("refresh-verse");

const verseReferences = [
    "Psalm 23:1",
    "Proverbs 3:5",
    "Matthew 5:9",
    "John 14:27",
    "Romans 12:12",
    "Philippians 4:6",
    "Psalm 46:10",
    "Isaiah 41:10",
    "Joshua 1:9",
    "Psalm 119:105",
    "Matthew 11:28",
    "Romans 8:28"
];

let lastVerseIndex = -1;


/**
 * Loads a Bible verse using bible-api.com.
 */
async function loadDailyVerse() {
    if (
        !dailyVerseElement ||
        !referenceElement ||
        !refreshButton ||
        !errorElement
    ) {
        return;
    }

    dailyVerseElement.textContent =
        "Finding a little wisdom for today...";

    referenceElement.textContent = "Loading...";
    errorElement.hidden = true;
    refreshButton.disabled = true;

    let randomIndex;

    do {
        randomIndex = Math.floor(
            Math.random() * verseReferences.length
        );
    } while (
        verseReferences.length > 1 &&
        randomIndex === lastVerseIndex
    );

    lastVerseIndex = randomIndex;

    const reference = verseReferences[randomIndex];

    const apiUrl =
        "https://bible-api.com/" +
        encodeURIComponent(reference) +
        "?translation=kjv";

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(
                `Bible API request failed: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.text) {
            throw new Error("No verse text was returned.");
        }

        dailyVerseElement.textContent = data.text.trim();

        referenceElement.textContent =
            data.reference || reference;

    } catch (error) {
        console.error("Unable to load Bible verse:", error);

        dailyVerseElement.textContent =
            "Your quiet moment is waiting. Please try again.";

        referenceElement.textContent = "Verse unavailable";

        errorElement.hidden = false;

    } finally {
        refreshButton.disabled = false;
    }
}


/* Load a verse when the page opens. */
if (dailyVerseElement) {
    loadDailyVerse();
}


/* Load another verse when the button is clicked. */
if (refreshButton) {
    refreshButton.addEventListener(
        "click",
        loadDailyVerse
    );
}


/* BIBLE BOOK SEARCH */

const bookSearch = document.getElementById("book-search");
const testamentTabs = document.querySelectorAll(".testament-tab");
const bookItems = document.querySelectorAll(".book-item");
const testamentSections = document.querySelectorAll(".testament-section");
const emptyBooks = document.getElementById("empty-books");

let selectedTestament = "all";

function filterBooks() {
    if (!bookSearch) return;

    const query = bookSearch.value.trim().toLowerCase();
    let visibleBooks = 0;

    bookItems.forEach((book) => {
        const matchesName = book.dataset.name.includes(query);
        const matchesTestament =
            selectedTestament === "all" ||
            book.dataset.testament === selectedTestament;

        const visible = matchesName && matchesTestament;

        book.hidden = !visible;

        if (visible) visibleBooks++;
    });

    testamentSections.forEach((section) => {
        const hasVisibleBook = [...section.querySelectorAll(".book-item")]
            .some((book) => !book.hidden);

        section.hidden = !hasVisibleBook;
    });

    emptyBooks.hidden = visibleBooks !== 0;
}

if (bookSearch) {
    bookSearch.addEventListener("input", filterBooks);
}

testamentTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        selectedTestament = tab.dataset.testament;

        testamentTabs.forEach((item) => {
            const active = item === tab;
            item.classList.toggle("active", active);
            item.setAttribute("aria-pressed", String(active));
        });

        filterBooks();
    });
});


/* CHAPTER READER + BOOKMARKS */

const readerPanel = document.getElementById("reader-panel");
const readerTitle = document.getElementById("reader-title");
const chapterSelect = document.getElementById("chapter-select");
const loadChapterButton = document.getElementById("load-chapter");
const readerStatus = document.getElementById("reader-status");
const verseList = document.getElementById("verse-list");
const closeReaderButton = document.getElementById("close-reader");
const previousChapterButton = document.getElementById("previous-chapter");
const nextChapterButton = document.getElementById("next-chapter");
const chapterPosition = document.getElementById("chapter-position");
const readerTranslation = document.getElementById("reader-translation");

const SAVED_VERSES_KEY = "stillword-saved-verses";

let currentBook = null;
let currentChapter = 1;
let requestNumber = 0;

// Read saved verses from browser storage.
function getSavedVerses() {
    try {
        const saved = localStorage.getItem(SAVED_VERSES_KEY);
        const verses = saved ? JSON.parse(saved) : [];

        return Array.isArray(verses) ? verses : [];
    } catch (error) {
        console.error("Could not read saved verses:", error);
        return [];
    }
}

// Save the updated list to browser storage.
function storeSavedVerses(verses) {
    try {
        localStorage.setItem(SAVED_VERSES_KEY, JSON.stringify(verses));
        return true;
    } catch (error) {
        console.error("Could not save verse:", error);
        alert("Unable to save this verse. Check your browser storage.");
        return false;
    }
}

// Check whether a verse is already bookmarked.
function isVerseSaved(reference) {
    return getSavedVerses().some(
        (verse) => verse.reference === reference
    );
}

// Add or remove a bookmark.
function toggleSavedVerse(reference, text, button) {
    const savedVerses = getSavedVerses();
    const existingIndex = savedVerses.findIndex(
        (verse) => verse.reference === reference
    );

    let updatedVerses;

    if (existingIndex !== -1) {
        // Remove the verse if it is already saved.
        updatedVerses = savedVerses.filter(
            (verse) => verse.reference !== reference
        );
    } else {
        // Save the verse and its details.
        updatedVerses = [
            ...savedVerses,
            {
                reference: reference,
                text: text.trim(),
                translation: "KJV",
                savedAt: new Date().toISOString()
            }
        ];
    }

    if (!storeSavedVerses(updatedVerses)) return;

    updateBookmarkButton(button, reference);

    button.setAttribute(
        "aria-label",
        isVerseSaved(reference)
            ? `Remove ${reference} from saved verses`
            : `Save ${reference}`
    );
}

// Update a bookmark button's appearance.
function updateBookmarkButton(button, reference) {
    const saved = isVerseSaved(reference);

    button.textContent = saved ? "♥ Saved" : "♡ Save verse";
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
}

// Update buttons if the saved list changes in another browser tab.
window.addEventListener("storage", function (event) {
    if (event.key !== SAVED_VERSES_KEY) return;

    document.querySelectorAll(".verse-save-button").forEach((button) => {
        updateBookmarkButton(button, button.dataset.reference);
    });
});

function updateChapterNavigation() {
    if (!currentBook) return;

    previousChapterButton.disabled = currentChapter <= 1;
    nextChapterButton.disabled = currentChapter >= currentBook.chapters;

    chapterPosition.textContent =
        `Chapter ${currentChapter} of ${currentBook.chapters}`;
}

function openBook(bookElement) {
    currentBook = {
        id: bookElement.dataset.bookId,
        name: bookElement.dataset.bookName,
        chapters: Number(bookElement.dataset.chapters)
    };

    currentChapter = 1;

    readerTitle.textContent = `${currentBook.name} ${currentChapter}`;
    chapterSelect.innerHTML = "";

    for (let chapter = 1; chapter <= currentBook.chapters; chapter++) {
        const option = document.createElement("option");
        option.value = chapter;
        option.textContent = `Chapter ${chapter}`;
        chapterSelect.appendChild(option);
    }

    chapterSelect.value = currentChapter;
    readerPanel.hidden = false;

    updateChapterNavigation();
    loadChapter();

    readerPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

bookItems.forEach((book) => {
    book.addEventListener("click", () => openBook(book));
});


async function loadChapter() {
    if (!currentBook) return;

    currentChapter = Number(chapterSelect.value);
    const thisRequest = ++requestNumber;

    // Get the translation selected by the reader.
    const translation = readerTranslation
        ? readerTranslation.value
        : "kjv";

    const translationNames = {
        kjv: "King James Version (KJV)",
        web: "World English Bible (WEB)",
        asv: "American Standard Version (ASV)"
    };

    readerTitle.textContent =
        `${currentBook.name} ${currentChapter}`;

    readerStatus.textContent = "Loading Scripture...";
    verseList.replaceChildren();
    updateChapterNavigation();

    // Local translations need a compatible API source.
    if (!translationNames[translation]) {
        readerStatus.textContent =
            "This translation is not connected yet. Please choose an English translation for now.";
        return;
    }

    const reference =
        `${currentBook.name} ${currentChapter}`;

    const url =
        `https://bible-api.com/${encodeURIComponent(reference)}` +
        `?translation=${encodeURIComponent(translation)}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "The Bible API could not load this chapter."
            );
        }

        const data = await response.json();

        // Ignore old responses if another request has started.
        if (thisRequest !== requestNumber) return;

        if (!Array.isArray(data.verses) || data.verses.length === 0) {
            throw new Error(
                "No verses were returned for this chapter."
            );
        }

        const fragment = document.createDocumentFragment();

        data.verses.forEach((verse) => {
            const row = document.createElement("div");
            row.className = "reader-verse";

            const verseReference =
                `${currentBook.name} ${currentChapter}:${verse.verse}`;

            const number = document.createElement("span");
            number.className = "verse-number";
            number.textContent = verse.verse;

            const text = document.createElement("p");
            text.className = "verse-text";
            text.textContent = verse.text.trim();

            // Create a save button for this verse.
            const saveButton = document.createElement("button");
            saveButton.type = "button";
            saveButton.className = "verse-save-button";
            saveButton.dataset.reference = verseReference;

            updateBookmarkButton(saveButton, verseReference);

            saveButton.setAttribute(
                "aria-label",
                isVerseSaved(verseReference)
                    ? `Remove ${verseReference} from saved verses`
                    : `Save ${verseReference}`
            );

            saveButton.addEventListener("click", function () {
                toggleSavedVerse(
                    verseReference,
                    verse.text,
                    saveButton
                );
            });

            row.append(number, text, saveButton);
            fragment.appendChild(row);
        });

        verseList.appendChild(fragment);

        readerStatus.textContent =
            `${data.reference || reference} · ` +
            translationNames[translation];
    } catch (error) {
        if (thisRequest !== requestNumber) return;

        console.error("Chapter loading error:", error);

        readerStatus.textContent =
            "We couldn't load this chapter. Check your internet connection and try again.";
    }
}


/* Chapter reader event listeners */

if (loadChapterButton) {
    loadChapterButton.addEventListener("click", loadChapter);
}

if (readerTranslation) {
    readerTranslation.addEventListener("change", () => {
        if (currentBook) {
            loadChapter();
        }
    });
}

if (chapterSelect) {
    chapterSelect.addEventListener("change", () => {
        currentChapter = Number(chapterSelect.value);
        updateChapterNavigation();
        loadChapter();
    });
}

if (previousChapterButton) {
    previousChapterButton.addEventListener("click", () => {
        if (currentBook && currentChapter > 1) {
            currentChapter--;
            chapterSelect.value = currentChapter;
            loadChapter();
        }
    });
}

if (nextChapterButton) {
    nextChapterButton.addEventListener("click", () => {
        if (currentBook && currentChapter < currentBook.chapters) {
            currentChapter++;
            chapterSelect.value = currentChapter;
            loadChapter();
        }
    });
}

if (closeReaderButton) {
    closeReaderButton.addEventListener("click", () => {
        requestNumber++;
        readerPanel.hidden = true;
    });
}


/* STILLWORD — SCRIPTURE SEARCH */

const searchForm = document.getElementById("scripture-search-form");

if (searchForm) {
    const queryInput = document.getElementById("scripture-query");
    const translationSelect = document.getElementById("translation-select");
    const searchLabel = document.getElementById("search-label");
    const searchHint = document.getElementById("search-hint");
    const searchTabs = document.querySelectorAll(".search-tab");
    const suggestionButtons = document.querySelectorAll(".suggestion-chip");
    const resultsContainer = document.getElementById("search-results");
    const resultsTitle = document.getElementById("results-title");
    const resultsCount = document.getElementById("results-count");
    const searchStatus = document.getElementById("search-status");

    // Keep track of the selected search mode.
    let searchMode = "keyword";

    // Update the interface when the user changes search mode.
    function setSearchMode(mode) {
        searchMode = mode;

        searchTabs.forEach((tab) => {
            const isActive = tab.dataset.mode === mode;

            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-pressed", String(isActive));
        });

        if (mode === "keyword") {
            searchLabel.textContent = "What word would you like to find?";
            queryInput.placeholder = "Try: love, hope, peace...";
            searchHint.textContent =
                "Find verses containing your chosen word.";
        } else {
            searchLabel.textContent = "Which Bible passage are you looking for?";
            queryInput.placeholder = "Example: John 3:16";
            searchHint.textContent =
                "Enter a book, chapter, or verse reference.";
        }

        queryInput.focus();
    }

    searchTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            setSearchMode(tab.dataset.mode);
        });
    });

    // Display a message while searching or when no results are available.
    function showStatus(message) {
        searchStatus.textContent = message;
        searchStatus.hidden = false;
    }

    // Build result cards safely using textContent.
    function displayResults(verses, translation) {
        resultsContainer.replaceChildren();
        resultsCount.textContent = "";

        if (!verses || verses.length === 0) {
            showStatus("No verses were found. Try another word or reference.");
            return;
        }

        searchStatus.hidden = true;
        resultsCount.textContent =
            `${verses.length} result${verses.length === 1 ? "" : "s"}`;

        verses.forEach((verse) => {
            const card = document.createElement("article");
            card.className = "search-result-card";

            const reference = document.createElement("p");
            reference.className = "search-result-reference";
            reference.textContent = verse.reference || "Bible passage";

            const text = document.createElement("p");
            text.className = "search-result-text";
            text.textContent = (verse.text || "").trim();

            const version = document.createElement("p");
            version.className = "search-result-version";
            version.textContent = `Translation: ${translation.toUpperCase()}`;

            card.append(reference, text, version);
            resultsContainer.appendChild(card);
        });
    }

   
    // Search Bible verses by keyword using the DWS Bible API.
    
async function searchByKeyword(query, translation) {
    const url = new URL(
        "https://bible-api.dws-cloud.com/v1/search"
    );

    url.searchParams.set("q", query.trim());
    url.searchParams.set("translation", translation.toLowerCase());
    url.searchParams.set("limit", "30");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Keyword search failed (${response.status}). Please try again.`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data.results)) {
        throw new Error(
            "The search service returned an unexpected response."
        );
    }

    return data.results.map((item) => ({
        reference: item.reference || "Bible passage",
        text: item.text || ""
    })).filter((verse) => verse.text.trim() !== "");
}

    async function searchByReference(query, translation) {
        const encodedReference = encodeURIComponent(query.trim());

        const url =
            `https://bible-api.com/${encodedReference}` +
            `?translation=${encodeURIComponent(translation.toLowerCase())}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "We couldn't find that passage. Check the reference and try again."
            );
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // The API may return one verse or multiple verses.
        if (Array.isArray(data.verses) && data.verses.length > 0) {
            return data.verses.map((verse) => ({
                reference:
                    `${verse.book_name} ${verse.chapter}:${verse.verse}`,
                text: verse.text
            }));
        }

        // Support a response containing one passage instead.
        if (data.text) {
            return [{
                reference: data.reference || query,
                text: data.text
            }];
        }

        return [];
    }

    // Handle form submission.
    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const query = queryInput.value.trim();
        const translation = translationSelect.value;

        if (!query) {
            showStatus("Please enter a word or Bible reference first.");
            queryInput.focus();
            return;
        }

        resultsContainer.replaceChildren();
        resultsCount.textContent = "";
        resultsTitle.textContent =
            searchMode === "keyword" ? "Keyword results" : "Passage results";

        showStatus("Searching Scripture...");
        searchForm.querySelector('button[type="submit"]').disabled = true;

        try {
            const verses = searchMode === "keyword"
                ? await searchByKeyword(query, translation.toUpperCase())
                : await searchByReference(query, translation);

            displayResults(verses, translation);
        } catch (error) {
            console.error("Stillword search error:", error);
            showStatus(
                error.message ||
                "Something went wrong. Please try again in a moment."
            );
        } finally {
            searchForm.querySelector('button[type="submit"]').disabled = false;
        }
    });

    // Example chips fill the search box and start the search.
    suggestionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const value = button.dataset.query;
            queryInput.value = value;

            // References with chapter numbers use reference mode.
            const looksLikeReference = /\d/.test(value);
            setSearchMode(looksLikeReference ? "reference" : "keyword");

            searchForm.requestSubmit();
        });
    });
}



/* STILLWORD — REFLECT PAGE
   Stores reflections in this browser only. */

(function () {
    const STORAGE_KEY = "stillword-journal-entries";

    const form = document.getElementById("reflect-form");

    // Do nothing on pages that do not contain the Reflect form.
    if (!form) return;

    const titleInput = document.getElementById("reflect-title");
    const referenceInput = document.getElementById("reflect-reference");
    const learnedInput = document.getElementById("reflect-learned");
    const meaningInput = document.getElementById("reflect-meaning");
    const applicationInput = document.getElementById("reflect-application");

    const formTitle = document.getElementById("reflect-form-title");
    const saveButton = document.getElementById("reflect-save-btn");
    const clearButton = document.getElementById("reflect-clear-btn");
    const cancelButton = document.getElementById("reflect-cancel-btn");
    const message = document.getElementById("reflect-message");

    const entriesList = document.getElementById("reflect-entries-list");
    const emptyState = document.getElementById("reflect-empty");
    const countLabel = document.getElementById("reflect-count");

    let editingId = null;

    // Safely load saved entries from localStorage.
    function getEntries() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const entries = saved ? JSON.parse(saved) : [];

            return Array.isArray(entries) ? entries : [];
        } catch (error) {
            console.error("Could not load reflections:", error);
            return [];
        }
    }

    // Save entries locally without using a database.
    function storeEntries(entries) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
            return true;
        } catch (error) {
            console.error("Could not save reflections:", error);
            showMessage(
                "Unable to save. Check your browser's available storage."
            );
            return false;
        }
    }

    // Prevent user-written text from being interpreted as HTML.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function showMessage(text) {
        message.textContent = text;
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function resetForm() {
        form.reset();
        editingId = null;

        formTitle.textContent = "A new reflection";
        saveButton.textContent = "Save reflection";
        cancelButton.hidden = true;

        showMessage("");
    }

    function renderEntries() {
        const entries = getEntries().sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        countLabel.textContent =
            entries.length + (entries.length === 1 ? " entry" : " entries");

        emptyState.hidden = entries.length > 0;
        entriesList.innerHTML = "";

        entries.forEach(function (entry) {
            const article = document.createElement("article");
            article.className = "reflect-entry";

            const title = escapeHTML(entry.title || "Untitled reflection");
            const reference = escapeHTML(entry.reference || "No reference added");
            const date = escapeHTML(formatDate(entry.updatedAt || entry.createdAt));

            article.innerHTML = `
                <h3>${title}</h3>
                <p class="reflect-entry-reference">${reference}</p>
                <p class="reflect-entry-date">Last updated: ${date}</p>

                

<div class="reflect-entry-actions">
    <button type="button"
        class="reflect-entry-btn"
        data-action="download"
        data-id="${escapeHTML(entry.id)}">
        Download
    </button>

    <button type="button"
        class="reflect-entry-btn"
        data-action="edit"
        data-id="${escapeHTML(entry.id)}">
        Edit
    </button>

    <button type="button"
        class="reflect-entry-btn danger"
        data-action="delete"
        data-id="${escapeHTML(entry.id)}">
        Delete
    </button>
</div>


            `;

            entriesList.appendChild(article);
        });
    }

    // Save a new reflection or update an existing one.
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const learned = learnedInput.value.trim();

        if (!learned) {
            showMessage("Please answer the first reflection question.");
            learnedInput.focus();
            return;
        }

        const entries = getEntries();
        const now = new Date().toISOString();

        const reflection = {
            id: editingId || (
                window.crypto && typeof window.crypto.randomUUID === "function"
                    ? window.crypto.randomUUID()
                    : String(Date.now()) + "-" + Math.random().toString(36).slice(2)
            ),
            title: titleInput.value.trim() || "Untitled reflection",
            reference: referenceInput.value.trim(),
            learned: learned,
            meaning: meaningInput.value.trim(),
            application: applicationInput.value.trim(),
            createdAt: now,
            updatedAt: now
        };

        let updatedEntries;

        if (editingId) {
            updatedEntries = entries.map(function (entry) {
                if (entry.id === editingId) {
                    return {
                        ...entry,
                        ...reflection,
                        createdAt: entry.createdAt || now
                    };
                }

                return entry;
            });
        } else {
            updatedEntries = [...entries, reflection];
        }

        if (!storeEntries(updatedEntries)) return;

        resetForm();
        renderEntries();
        showMessage("Your reflection has been saved in this browser.");
    });

    // Clear the form or leave editing mode.
    clearButton.addEventListener("click", function () {
        resetForm();
    });

    cancelButton.addEventListener("click", function () {
        resetForm();
    });

    // Handle Edit and Delete buttons in saved reflection cards.
    entriesList.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;
        
const entries = getEntries();

if (action === "download") {
    const entry = entries.find(function (item) {
        return item.id === id;
    });

    if (!entry) return;

    const date = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString()
        : "Not specified";

    const content = [
        "STILLWORD — PERSONAL REFLECTION",
        "",
        "Title: " + (entry.title || "Untitled reflection"),
        "Bible Reference: " + (entry.reference || "Not specified"),
        "Date: " + date,
        "",
        "WHAT STOOD OUT TO YOU?",
        entry.learned || "No response",
        "",
        "WHAT DID YOU LEARN?",
        entry.meaning || "No response",
        "",
        "HOW CAN YOU APPLY IT?",
        entry.application || "No response",
        ""
    ].join("\n");

    const file = new Blob(
        ["\uFEFF", content],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = (entry.title || "Stillword-Reflection")
        .replace(/[<>:"/\\|?*]/g, "-")
        .trim() + ".txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}

if (action === "edit") {

            const entry = entries.find(function (item) {
                return item.id === id;
            });

            if (!entry) return;

            editingId = entry.id;

            titleInput.value = entry.title || "";
            referenceInput.value = entry.reference || "";
            learnedInput.value = entry.learned || "";
            meaningInput.value = entry.meaning || "";
            applicationInput.value = entry.application || "";

            formTitle.textContent = "Edit your reflection";
            saveButton.textContent = "Update reflection";
            cancelButton.hidden = false;

            showMessage("Editing your saved reflection.");
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            titleInput.focus();
        }

        if (action === "delete") {
            const confirmed = window.confirm(
                "Delete this reflection? This cannot be undone."
            );

            if (!confirmed) return;

            const remainingEntries = entries.filter(function (entry) {
                return entry.id !== id;
            });

            if (!storeEntries(remainingEntries)) return;

            if (editingId === id) {
                resetForm();
            }

            renderEntries();
            showMessage("Reflection deleted.");
        }
    });

    // Display existing reflections when the page opens.
    renderEntries();
})();


/* STILLWORD — SAVED VERSES PAGE */

(function () {
    const STORAGE_KEY = "stillword-saved-verses";

    const savedList = document.getElementById("saved-verses-list");
    const emptyState = document.getElementById("saved-empty");
    const countLabel = document.getElementById("saved-count");
    const message = document.getElementById("saved-message");

    // Run only on the Saved page.
    if (!savedList || !emptyState || !countLabel) return;

    function getSavedVerses() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const verses = data ? JSON.parse(data) : [];

            return Array.isArray(verses) ? verses : [];
        } catch (error) {
            console.error("Could not load saved verses:", error);
            return [];
        }
    }

    function showMessage(text) {
        if (!message) return;

        message.textContent = text;
        message.hidden = !text;
    }

    function renderSavedVerses() {
        const verses = getSavedVerses();

        savedList.replaceChildren();

        countLabel.textContent =
            `${verses.length} ${verses.length === 1 ? "verse" : "verses"}`;

        emptyState.hidden = verses.length > 0;

        if (verses.length === 0) return;

        verses.slice().reverse().forEach((verse) => {
            const card = document.createElement("article");
            card.className = "saved-verse-card";

            const reference = document.createElement("h3");
            reference.className = "saved-verse-reference";
            reference.textContent = verse.reference || "Bible verse";

            const text = document.createElement("p");
            text.className = "saved-verse-text";
            text.textContent = verse.text || "";

            const translation = document.createElement("p");
            translation.className = "saved-verse-translation";
            translation.textContent =
                `Translation: ${verse.translation || "KJV"}`;

            const actions = document.createElement("div");
            actions.className = "saved-verse-actions";

            const readButton = document.createElement("a");
            readButton.className = "saved-verse-button";
            readButton.href = "books.html";
            readButton.textContent = "Read Scripture";

            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "saved-verse-button";
            copyButton.textContent = "Copy verse";

            copyButton.addEventListener("click", async () => {
                const copyText =
                    `${verse.reference}\n${verse.text}\n` +
                    `Translation: ${verse.translation || "KJV"}`;

                try {
                    await navigator.clipboard.writeText(copyText);
                    showMessage(`${verse.reference} copied.`);
                } catch (error) {
                    showMessage(
                        "Copying was unavailable. Please copy the verse manually."
                    );
                }
            });

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "saved-verse-button danger";
            removeButton.textContent = "Remove";

            removeButton.addEventListener("click", () => {
                const remaining = getSavedVerses().filter(
                    (item) => item.reference !== verse.reference
                );

                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(remaining)
                    );

                    showMessage(`${verse.reference} removed from Saved.`);
                    renderSavedVerses();
                } catch (error) {
                    console.error("Could not remove saved verse:", error);
                    showMessage("Unable to update your saved verses.");
                }
            });

            actions.append(readButton, copyButton, removeButton);
            card.append(reference, text, translation, actions);
            savedList.appendChild(card);
        });
    }

    // Show saved verses when the page opens.
    renderSavedVerses();

    // Refresh the list if localStorage changes in another tab.
    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
            renderSavedVerses();
        }
    });
})();



/* Download Stillword journal reflections */
(() => {
    const downloadButton = document.getElementById("reflect-download-btn");

    // Run only on the Reflect page.
    if (!downloadButton) return;

    downloadButton.addEventListener("click", () => {
        console.log("TEST 1: Download button clicked");
        try {
            const savedData = localStorage.getItem("stillword-journal-entries");
            const entries = savedData ? JSON.parse(savedData) : [];
            console.log("TEST 2: Entries found:", entries.length);

            if (!Array.isArray(entries) || entries.length === 0) {
                alert("You don't have any saved reflections to download yet.");
                return;
            }

            const content = entries.map((entry, index) => {
                const date = entry.createdAt
                    ? new Date(entry.createdAt).toLocaleDateString()
                    : "Not specified";

                return [
                    `REFLECTION ${index + 1}`,
                    `Title: ${entry.title || "Untitled reflection"}`,
                    `Bible Reference: ${entry.reference || "Not specified"}`,
                    `Date: ${date}`,
                    "",
                    "WHAT STOOD OUT TO YOU?",
                    entry.learned || "No response",
                    "",
                    "WHAT DID YOU LEARN?",
                    entry.meaning || "No response",
                    "",
                    "HOW CAN YOU APPLY IT?",
                    entry.application || "No response",
                    "",
                    "----------------------------------------",
                    ""
                ].join("\n");
            }).join("\n");

            const file = new Blob(
                ["\uFEFF", content],
                { type: "text/plain;charset=utf-8" }
            );

            const url = URL.createObjectURL(file);
            const link = document.createElement("a");

            link.href = url;
            link.download = "Stillword-Reflections.txt";
            link.style.display = "none";

            document.body.appendChild(link);
            console.log("TEST 3: Triggering file download");
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            console.log("Stillword: Download initiated.");
        } catch (error) {
            console.error("Stillword download error:", error);
            alert("Unable to download reflections. Check the browser Console for details.");
        }
    });

    console.log("Stillword: Download button handler attached.");
})();
