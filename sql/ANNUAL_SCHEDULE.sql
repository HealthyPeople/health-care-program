-- 연간 일정 (ANNUAL_SCHEDULE)
-- 실행 DB: [돌봄시설DB]
-- 참고: /api/annual-schedule 최초 호출 시에도 동일 스키마로 자동 생성됩니다.
-- SCH_DATE: 시작일, SCH_END_DATE: 종료일 (하루 일정이면 동일 값)

IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE'
)
BEGIN
  CREATE TABLE [돌봄시설DB].[dbo].[ANNUAL_SCHEDULE] (
    [AS_SEQ]        INT IDENTITY(1,1) NOT NULL,
    [ANCD]          INT NOT NULL,
    [SCH_DATE]      DATE NOT NULL,
    [SCH_END_DATE]  DATE NOT NULL,
    [TITLE]         NVARCHAR(200) NOT NULL,
    [CONTENT]       NVARCHAR(MAX) NULL,
    [SCH_TYPE]      NVARCHAR(50) NULL,
    [REG_ID]        NVARCHAR(50) NULL,
    [REG_DATE]      DATETIME NULL,
    [MOD_ID]        NVARCHAR(50) NULL,
    [MOD_DATE]      DATETIME NULL,
    CONSTRAINT [PK_ANNUAL_SCHEDULE] PRIMARY KEY CLUSTERED ([AS_SEQ])
  );

  CREATE NONCLUSTERED INDEX [IX_ANNUAL_SCHEDULE_ANCD_SCH_DATE]
    ON [돌봄시설DB].[dbo].[ANNUAL_SCHEDULE] ([ANCD], [SCH_DATE], [SCH_END_DATE]);
END
GO

-- 잘못 생성된 SCH_START_DATE → SCH_DATE 복구
IF EXISTS (
  SELECT 1 FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_START_DATE'
)
AND NOT EXISTS (
  SELECT 1 FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_DATE'
)
BEGIN
  EXEC sp_rename N'[돌봄시설DB].[dbo].[ANNUAL_SCHEDULE].[SCH_START_DATE]', N'SCH_DATE', N'COLUMN';
END
GO

-- 종료일 컬럼 추가
IF EXISTS (
  SELECT 1 FROM sys.tables t
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE'
)
AND NOT EXISTS (
  SELECT 1 FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_END_DATE'
)
BEGIN
  ALTER TABLE [돌봄시설DB].[dbo].[ANNUAL_SCHEDULE]
    ADD [SCH_END_DATE] DATE NULL;
END
GO

-- 기존 NULL 종료일 → 시작일로 채운 뒤 NOT NULL
IF EXISTS (
  SELECT 1 FROM sys.columns c
  INNER JOIN sys.tables t ON c.object_id = t.object_id
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE' AND c.name = N'SCH_END_DATE'
)
BEGIN
  UPDATE [돌봄시설DB].[dbo].[ANNUAL_SCHEDULE]
  SET [SCH_END_DATE] = [SCH_DATE]
  WHERE [SCH_END_DATE] IS NULL
    AND [SCH_DATE] IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = N'dbo' AND t.name = N'ANNUAL_SCHEDULE'
      AND c.name = N'SCH_END_DATE' AND c.is_nullable = 1
  )
  BEGIN
    ALTER TABLE [돌봄시설DB].[dbo].[ANNUAL_SCHEDULE]
      ALTER COLUMN [SCH_END_DATE] DATE NOT NULL;
  END
END
GO
