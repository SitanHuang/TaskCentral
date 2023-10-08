-- Your SQL goes here
CREATE TABLE `users` (
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `create` bigint(20) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  `last_visited` bigint(20) DEFAULT 0,
  `last_updated` bigint(20) DEFAULT 0,
  `email` varchar(255) DEFAULT '',
  PRIMARY KEY (`username`)
);
