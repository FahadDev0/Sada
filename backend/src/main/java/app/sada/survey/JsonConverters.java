package app.sada.survey;

import app.sada.common.Json;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.type.TypeReference;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** JSON-in-TEXT converters for the small structured columns. */
public final class JsonConverters {

    private JsonConverters() {
    }

    @Converter
    public static class StringListConverter implements AttributeConverter<List<String>, String> {

        private static final TypeReference<List<String>> TYPE = new TypeReference<>() {
        };

        @Override
        public String convertToDatabaseColumn(List<String> attribute) {
            return Json.write(attribute == null ? List.of() : attribute);
        }

        @Override
        public List<String> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) {
                return new ArrayList<>();
            }
            return new ArrayList<>(Json.read(dbData, TYPE));
        }
    }

    @Converter
    public static class SettingsConverter implements AttributeConverter<QuestionSettings, String> {

        @Override
        public String convertToDatabaseColumn(QuestionSettings attribute) {
            return Json.write(attribute == null ? QuestionSettings.EMPTY : attribute);
        }

        @Override
        public QuestionSettings convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) {
                return QuestionSettings.EMPTY;
            }
            return Json.read(dbData, QuestionSettings.class);
        }
    }

    @Converter
    public static class AnswersConverter implements AttributeConverter<Map<String, Object>, String> {

        @Override
        public String convertToDatabaseColumn(Map<String, Object> attribute) {
            return Json.write(attribute == null ? Map.of() : attribute);
        }

        @Override
        public Map<String, Object> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) {
                return Map.of();
            }
            return Json.readMap(dbData);
        }
    }
}
