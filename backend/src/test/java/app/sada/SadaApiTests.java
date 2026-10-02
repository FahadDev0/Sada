package app.sada;

import app.sada.common.Json;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end API tests against a real PostgreSQL (see application.yml defaults / CI service).
 */
@SpringBootTest(properties = {"app.limits.auth-per-minute=1000", "app.limits.submissions-per-minute=1000"})
@AutoConfigureMockMvc
class SadaApiTests {

    @Autowired
    MockMvc mvc;

    // ------------------------------------------------------------------ helpers

    private static String json(Object value) {
        return Json.write(value);
    }

    private Map<String, Object> body(MvcResult result) throws Exception {
        return Json.readMap(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    private String register(String name) throws Exception {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        MvcResult result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "email", email, "password", "secret-pass-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();
        return (String) body(result).get("token");
    }

    private static Map<String, Object> question(String id, String type, String title, boolean required,
                                                List<String> options, Map<String, Object> settings) {
        Map<String, Object> q = new java.util.LinkedHashMap<>();
        q.put("id", id);
        q.put("type", type);
        q.put("title", title);
        q.put("required", required);
        q.put("options", options);
        q.put("settings", settings);
        return q;
    }

    // ------------------------------------------------------------------ tests

    @Test
    void publicConfigWorksWithoutAuth() throws Exception {
        mvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiEnabled").value(false))
                .andExpect(jsonPath("$.googleEnabled").value(false));
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void fullSurveyLifecycle() throws Exception {
        String token = register("Owner");

        mvc.perform(auth(get("/api/auth/me"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Owner"));

        // create
        Map<String, Object> create = Map.of(
                "title", "رضا العملاء",
                "description", "استبيان قصير",
                "language", "ar",
                "themeColor", "#0F766E",
                "oneResponsePerDevice", false,
                "questions", List.of(
                        question("tmp-1", "SINGLE_CHOICE", "كيف عرفت عنا؟", true, List.of("تويتر", "صديق", " صديق ", ""), null),
                        question("tmp-2", "MULTIPLE_CHOICE", "ما الذي أعجبك؟", false, List.of("السعر", "الجودة", "الخدمة"), null),
                        question("tmp-3", "SCALE", "ما احتمال أن توصي بنا؟", true, List.of(), Map.of("min", 0, "max", 10)),
                        question("tmp-4", "SHORT_TEXT", "ملاحظات", false, List.of(), null)));

        MvcResult created = mvc.perform(auth(post("/api/surveys"), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json(create)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.themeColor").value("#0f766e"))
                .andExpect(jsonPath("$.questions.length()").value(4))
                // options are trimmed and de-duplicated
                .andExpect(jsonPath("$.questions[0].options.length()").value(2))
                .andExpect(jsonPath("$.questions[2].settings.min").value(0))
                .andExpect(jsonPath("$.questions[2].settings.max").value(10))
                .andReturn();
        Map<String, Object> survey = body(created);
        String surveyId = (String) survey.get("id");
        String slug = (String) survey.get("slug");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> qs = (List<Map<String, Object>>) survey.get("questions");
        String q1 = (String) qs.get(0).get("id");
        String q2 = (String) qs.get(1).get("id");
        String q3 = (String) qs.get(2).get("id");
        String q4 = (String) qs.get(3).get("id");

        // drafts are not public
        mvc.perform(get("/api/public/surveys/" + slug)).andExpect(status().isNotFound());

        // publish
        mvc.perform(auth(post("/api/surveys/" + surveyId + "/status"), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "PUBLISHED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        mvc.perform(get("/api/public/surveys/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingResponses").value(true))
                .andExpect(jsonPath("$.questions.length()").value(4));

        // valid submissions
        submit(slug, Map.of(q1, "تويتر", q2, List.of("الجودة", "السعر"), q3, 10, q4, "ممتاز"), 201);
        submit(slug, Map.of(q1, "صديق", q3, 9), 201);
        submit(slug, Map.of(q1, "تويتر", q2, List.of("الخدمة"), q3, 3), 201);

        // invalid submissions
        MvcResult missing = submit(slug, Map.of(q4, "بدون إجابات مطلوبة"), 400);
        assertThat(body(missing).get("code")).isEqualTo("INVALID_ANSWERS");
        MvcResult badOption = submit(slug, Map.of(q1, "غير موجود", q3, 5), 400);
        assertThat(body(badOption).get("code")).isEqualTo("INVALID_ANSWERS");
        submit(slug, Map.of(q1, "صديق", q3, 11), 400);

        // results
        mvc.perform(auth(get("/api/surveys/" + surveyId + "/results?tz=Asia/Riyadh"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResponses").value(3))
                .andExpect(jsonPath("$.questions[0].options[0].label").value("تويتر"))
                .andExpect(jsonPath("$.questions[0].options[0].count").value(2))
                .andExpect(jsonPath("$.questions[1].answered").value(2))
                .andExpect(jsonPath("$.questions[2].nps").value(33))
                .andExpect(jsonPath("$.questions[3].textAnswers[0].value").value("ممتاز"))
                .andExpect(jsonPath("$.timeline.length()").value(7));

        mvc.perform(auth(get("/api/surveys/" + surveyId + "/responses?page=0&size=2"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items.length()").value(2));

        MvcResult csv = mvc.perform(auth(get("/api/surveys/" + surveyId + "/export"), token))
                .andExpect(status().isOk())
                .andReturn();
        String csvText = csv.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csvText).startsWith("﻿").contains("كيف عرفت عنا؟").contains("السعر; الجودة");
        assertThat(csv.getResponse().getHeader("Content-Disposition")).contains("sada-" + slug + ".csv");

        // list shows counts
        mvc.perform(auth(get("/api/surveys"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].responseCount").value(3))
                .andExpect(jsonPath("$[0].questionCount").value(4));

        // edit: keep q1 (renamed) + q3, drop q2/q4, add a new rating question
        Map<String, Object> update = Map.of(
                "title", "رضا العملاء ٢",
                "language", "ar",
                "oneResponsePerDevice", true,
                "questions", List.of(
                        question(q3, "SCALE", "ما احتمال أن توصي بنا؟", true, List.of(), Map.of("min", 0, "max", 10)),
                        question(q1, "SINGLE_CHOICE", "من أين سمعت عنا؟", true, List.of("تويتر", "صديق"), null),
                        question("new-1", "RATING", "قيّم التجربة", false, null, Map.of("max", 5))));
        mvc.perform(auth(put("/api/surveys/" + surveyId), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions.length()").value(3))
                .andExpect(jsonPath("$.questions[0].id").value(q3))
                .andExpect(jsonPath("$.questions[1].id").value(q1))
                .andExpect(jsonPath("$.questions[1].title").value("من أين سمعت عنا؟"))
                .andExpect(jsonPath("$.questions[2].settings.max").value(5))
                .andExpect(jsonPath("$.responseCount").value(3))
                .andExpect(jsonPath("$.oneResponsePerDevice").value(true));

        // answers to kept questions survive the edit
        mvc.perform(auth(get("/api/surveys/" + surveyId + "/results"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[1].options[0].count").value(2));

        // duplicate
        mvc.perform(auth(post("/api/surveys/" + surveyId + "/duplicate"), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.questions.length()").value(3))
                .andExpect(jsonPath("$.responseCount").value(0));

        // close → public form refuses submissions
        mvc.perform(auth(post("/api/surveys/" + surveyId + "/status"), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "CLOSED"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/public/surveys/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingResponses").value(false))
                .andExpect(jsonPath("$.questions.length()").value(0));
        MvcResult closed = submit(slug, Map.of(q1, "صديق", q3, 7), 410);
        assertThat(body(closed).get("code")).isEqualTo("SURVEY_CLOSED");

        // delete
        mvc.perform(auth(delete("/api/surveys/" + surveyId), token)).andExpect(status().isNoContent());
        mvc.perform(auth(get("/api/surveys/" + surveyId), token)).andExpect(status().isNotFound());
    }

    @Test
    void securityAndOwnership() throws Exception {
        mvc.perform(get("/api/surveys")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/surveys").header("Authorization", "Bearer not-a-token")).andExpect(status().isUnauthorized());

        String alice = register("Alice");
        String bob = register("Bob");

        MvcResult created = mvc.perform(auth(post("/api/surveys"), alice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "Private", "language", "en", "questions", List.of()))))
                .andExpect(status().isCreated())
                .andReturn();
        String id = (String) body(created).get("id");

        // publishing an empty survey is refused
        mvc.perform(auth(post("/api/surveys/" + id + "/status"), alice)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "PUBLISHED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NO_QUESTIONS"));

        // Bob can neither see nor modify Alice's survey
        mvc.perform(auth(get("/api/surveys/" + id), bob)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/surveys/" + id + "/results"), bob)).andExpect(status().isNotFound());
        mvc.perform(auth(delete("/api/surveys/" + id), bob)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/surveys/not-a-uuid"), bob)).andExpect(status().isNotFound());

        // invalid survey payloads
        mvc.perform(auth(post("/api/surveys"), alice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "", "questions", List.of()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
        mvc.perform(auth(post("/api/surveys"), alice)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "x", "questions",
                                List.of(question(null, "SINGLE_CHOICE", "No options", false, List.of(), null))))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details['questions[0].options']").value("CHOICE_NEEDS_OPTIONS"));
    }

    @Test
    void authErrors() throws Exception {
        String email = "dup-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> registration = Map.of("name", "Dup", "email", email, "password", "secret-pass-1");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(registration)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(registration)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email.toUpperCase(), "password", "secret-pass-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Short", "email", "short@example.com", "password", "123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION"));

        mvc.perform(post("/api/auth/google").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("credential", "anything"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("GOOGLE_DISABLED"));
    }

    private MvcResult submit(String slug, Map<String, Object> answers, int expectedStatus) throws Exception {
        return mvc.perform(post("/api/public/surveys/" + slug + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("answers", answers))))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }
}
