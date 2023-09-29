Sequel.migration do
  change do
    alter_table(:users) do
      add_column :email, :String, default: ''
    end
    puts "Add column email to table users"
  end
end

