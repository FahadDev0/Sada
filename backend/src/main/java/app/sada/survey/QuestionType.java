package app.sada.survey;

public enum QuestionType {
    SHORT_TEXT,
    LONG_TEXT,
    SINGLE_CHOICE,
    MULTIPLE_CHOICE,
    DROPDOWN,
    RATING,
    SCALE,
    NUMBER,
    DATE;

    public boolean isChoice() {
        return this == SINGLE_CHOICE || this == MULTIPLE_CHOICE || this == DROPDOWN;
    }

    public boolean isText() {
        return this == SHORT_TEXT || this == LONG_TEXT;
    }
}
