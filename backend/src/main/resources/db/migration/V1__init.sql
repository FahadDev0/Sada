-- Sada schema. JSON payloads (options, settings, answers) are stored as TEXT
-- and (de)serialised in the application, which keeps the mapping portable.

CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(320)  NOT NULL UNIQUE,
    name          VARCHAR(120)  NOT NULL,
    password_hash VARCHAR(100),
    google_sub    VARCHAR(64) UNIQUE,
    avatar_url    VARCHAR(1024),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE surveys (
    id                      UUID PRIMARY KEY,
    owner_id                UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    slug                    VARCHAR(16)  NOT NULL UNIQUE,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    language                VARCHAR(5)   NOT NULL DEFAULT 'ar',
    status                  VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
    theme_color             VARCHAR(16)  NOT NULL DEFAULT '#0f766e',
    thank_you_message       TEXT,
    one_response_per_device BOOLEAN      NOT NULL DEFAULT FALSE,
    closes_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_surveys_owner ON surveys (owner_id, updated_at DESC);

CREATE TABLE questions (
    id          UUID PRIMARY KEY,
    survey_id   UUID         NOT NULL REFERENCES surveys (id) ON DELETE CASCADE,
    sort_order  INT          NOT NULL,
    type        VARCHAR(24)  NOT NULL,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    required    BOOLEAN      NOT NULL DEFAULT FALSE,
    options     TEXT         NOT NULL DEFAULT '[]',
    settings    TEXT         NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_questions_survey ON questions (survey_id, sort_order);

CREATE TABLE responses (
    id           UUID PRIMARY KEY,
    survey_id    UUID        NOT NULL REFERENCES surveys (id) ON DELETE CASCADE,
    answers      TEXT        NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responses_survey ON responses (survey_id, submitted_at DESC);
