// @generated automatically by Diesel CLI.

diesel::table! {
    users (username) {
        #[max_length = 255]
        username -> Varchar,
        #[max_length = 255]
        password -> Varchar,
        create -> Bigint,
        status -> Integer,
        last_visited -> Nullable<Bigint>,
        last_updated -> Nullable<Bigint>,
        #[max_length = 255]
        email -> Nullable<Varchar>,
    }
}
