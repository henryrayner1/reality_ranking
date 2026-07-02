-- AlterTable
CREATE SEQUENCE week_weeknumber_seq;
ALTER TABLE "Week" ALTER COLUMN "weekNumber" SET DEFAULT nextval('week_weeknumber_seq');
ALTER SEQUENCE week_weeknumber_seq OWNED BY "Week"."weekNumber";
