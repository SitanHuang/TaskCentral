require 'bcrypt'

Sequel.migration do
  up do
    DB[:users].each do |row|
      encrypted_password = BCrypt::Password.create(row[:password])
      DB[:users].where(username: row[:username]).update(password: encrypted_password)
    end
  end

  down do
    raise Sequel::IrreversibleMigration
  end
end

