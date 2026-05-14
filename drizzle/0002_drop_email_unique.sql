-- Drop the erroneous unique constraint on csv_records.email.
-- Multiple CSV uploads can contain the same email address (e.g. same student in multiple batches).
DROP INDEX IF EXISTS `csv_records_email_unique`;
