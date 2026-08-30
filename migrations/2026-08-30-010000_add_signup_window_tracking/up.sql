ALTER TABLE `signup_limit`
  ADD COLUMN `window_started` bigint(20) NOT NULL DEFAULT 0,
  ADD COLUMN `signup_count` int(11) NOT NULL DEFAULT 0;

UPDATE `signup_limit`
SET
  `window_started` = `last_signup`,
  `signup_count` = CASE WHEN `last_signup` > 0 THEN 1 ELSE 0 END
WHERE `id` = 1;
