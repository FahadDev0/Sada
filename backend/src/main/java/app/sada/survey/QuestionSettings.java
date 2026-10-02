package app.sada.survey;

/**
 * Per-type options. RATING uses {@code max} (stars); SCALE uses min/max plus end labels;
 * NUMBER optionally bounds the value with min/max. Other types ignore it.
 */
public record QuestionSettings(Integer min, Integer max, String minLabel, String maxLabel) {

    public static final QuestionSettings EMPTY = new QuestionSettings(null, null, null, null);
}
