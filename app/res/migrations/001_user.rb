Sequel.migration do
  up do
    create_table :users do
      String :username, primary_key: true, null: false
      String :password, null: false
      Sequel::Bignum :create, null: false
      Fixnum :status, null: false, default: 0
    end
    puts 'Create table users'
    require_relative '../../models/user.rb'
  end

  down do
    drop_table :users
  end
end
