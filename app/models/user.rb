class User < Sequel::Model(:users)
  set_primary_key :username

  def data_path
    self.username[0..2].ljust(3, '_').split("").join("/") + '/' + self.username
  end
  def data_dir
    self.username[0..2].ljust(3, '_').split("").join("/") + '/'
  end
end
