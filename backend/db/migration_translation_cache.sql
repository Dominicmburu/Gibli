-- Run this against your database (giblidatabase / gibli-server) in SSMS
-- Creates the TranslationCache table and two stored procedures.

-- ============================================================
-- Table
-- ============================================================
IF OBJECT_ID('dbo.TranslationCache', 'U') IS NULL
CREATE TABLE [dbo].[TranslationCache] (
    [SourceHash]     CHAR(64)       NOT NULL,   -- SHA-256 hex of source text
    [TargetLang]     VARCHAR(10)    NOT NULL,
    [SourceText]     NVARCHAR(MAX)  NOT NULL,
    [TranslatedText] NVARCHAR(MAX)  NOT NULL,
    [CreatedAt]      DATETIME       NOT NULL CONSTRAINT DF_TranslationCache_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT PK_TranslationCache PRIMARY KEY ([SourceHash], [TargetLang])
)
GO

-- ============================================================
-- Lookup: returns cached rows for a batch of source text hashes
-- @HashesJson  : JSON array of objects: [{"hash":"<sha256hex>"}, ...]
-- @TargetLang  : BCP-47 code, e.g. 'de'
-- ============================================================
CREATE OR ALTER PROCEDURE [dbo].[GetCachedTranslations]
    @HashesJson  NVARCHAR(MAX),
    @TargetLang  VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT tc.[SourceHash], tc.[TranslatedText]
    FROM   [dbo].[TranslationCache] tc
    INNER JOIN OPENJSON(@HashesJson)
        WITH ([hash] CHAR(64) '$.hash') j
        ON tc.[SourceHash] = j.[hash]
    WHERE  tc.[TargetLang] = @TargetLang;
END
GO

-- ============================================================
-- Save: inserts new translations (skips rows that already exist)
-- @TranslationsJson : JSON array: [{"hash":"...","sourceText":"...","translatedText":"..."}, ...]
-- @TargetLang       : BCP-47 code
-- ============================================================
CREATE OR ALTER PROCEDURE [dbo].[SaveTranslations]
    @TranslationsJson  NVARCHAR(MAX),
    @TargetLang        VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    MERGE [dbo].[TranslationCache] AS target
    USING (
        SELECT [hash], [sourceText], [translatedText]
        FROM OPENJSON(@TranslationsJson)
        WITH (
            [hash]            CHAR(64)       '$.hash',
            [sourceText]      NVARCHAR(MAX)  '$.sourceText',
            [translatedText]  NVARCHAR(MAX)  '$.translatedText'
        )
    ) AS source
        ON  target.[SourceHash] = source.[hash]
        AND target.[TargetLang] = @TargetLang
    WHEN NOT MATCHED THEN
        INSERT ([SourceHash], [TargetLang], [SourceText], [TranslatedText])
        VALUES (source.[hash], @TargetLang, source.[sourceText], source.[translatedText]);
END
GO
