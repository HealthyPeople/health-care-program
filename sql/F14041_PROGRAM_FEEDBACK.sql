-- 프로그램 의견수렴 및 반영 (F14041_PROGRAM_FEEDBACK)
-- 실행 DB: [돌봄시설DB]
-- 참고: /api/f14041-program-feedback 최초 호출 시에도 동일 스키마로 자동 생성됩니다.
--       (DB 계정에 CREATE TABLE 권한이 있어야 함)

IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = N'dbo' AND t.name = N'F14041_PROGRAM_FEEDBACK'
)
BEGIN
  CREATE TABLE [돌봄시설DB].[dbo].[F14041_PROGRAM_FEEDBACK] (
    [OPINION_SEQ]     INT IDENTITY(1,1) NOT NULL,
    [PGSEQ]           INT NOT NULL,
    [YM]              CHAR(6) NOT NULL,
    [OPINION_CONTENT] NVARCHAR(MAX) NULL,
    [APPLY_CONTENT]   NVARCHAR(MAX) NULL,
    [REMARK]          NVARCHAR(500) NULL,
    [REG_ID]          VARCHAR(20) NULL,
    [REG_DATE]        DATETIME NULL,
    [MOD_ID]          VARCHAR(20) NULL,
    [MOD_DATE]        DATETIME NULL,
    CONSTRAINT [PK_F14041_PROGRAM_FEEDBACK] PRIMARY KEY CLUSTERED ([OPINION_SEQ]),
    CONSTRAINT [UQ_F14041_PROGRAM_FEEDBACK_PGSEQ_YM] UNIQUE ([PGSEQ], [YM])
  );
END
GO
