-- Add missing talent act types to the enum
-- This migration adds all act types that are available in the frontend but missing from the database enum

-- Add new enum values for talent_act
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'solo artist';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'producer';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'vocalist';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'instrumentalist';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'songwriter';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'composer';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'sound engineer';
ALTER TYPE public.talent_act ADD VALUE IF NOT EXISTS 'music teacher';

-- Note: The following values already exist in the enum:
-- 'dj', 'band', 'saxophonist', 'percussionist', 'singer', 'keyboardist', 'drummer'

