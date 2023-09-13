Sequel.migration do
  change do
    alter_table(:users) do
      add_column :last_visited, :Bignum, default: 0
      add_column :last_updated, :Bignum, default: 0
    end
    puts "Add columns last_visited, last_updated to table users"
  end
end

