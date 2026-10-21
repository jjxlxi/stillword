
/* STILLWORD — chapter scroll behavior */

(function () {
    const readerTitle = document.getElementById("reader-title");
    const previousButton = document.getElementById("previous-chapter");
    const nextButton = document.getElementById("next-chapter");
    const chapterSelect = document.getElementById("chapter-select");
    const loadButton = document.getElementById("load-chapter");

    if (!readerTitle) return;

    function scrollToChapterTop() {
        window.requestAnimationFrame(() => {
            readerTitle.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    [
        previousButton,
        nextButton,
        chapterSelect,
        loadButton
    ].forEach((control) => {
        if (!control) return;

        control.addEventListener(
            control.tagName === "SELECT" ? "change" : "click",
            scrollToChapterTop
        );
    });
})();
