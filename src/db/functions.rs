
use diesel::sql_function;
use diesel::sql_types::*;

sql_function! {
    fn lower(x: Text) -> Text;
}
