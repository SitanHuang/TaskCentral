ALTER TABLE `users`
  ADD COLUMN `notes` TEXT NOT NULL DEFAULT '';

CREATE TABLE `signup_limit` (
  `id` int(11) NOT NULL,
  `last_signup` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
);

INSERT INTO `signup_limit` (`id`, `last_signup`) VALUES (1, 0);
