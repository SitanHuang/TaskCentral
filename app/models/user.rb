class User < Sequel::Model(:users)
  set_primary_key :username

  def data_path
    self.username[0..2].ljust(3, '_').split("").join("/") + '/' + self.username
  end
  def data_dir
    self.username[0..2].ljust(3, '_').split("").join("/") + '/'
  end

  def is_root?
    self.status >= 99
  end

  def quota
    # 126kb > 505kb > 1.1mb > 2.0mb > 3.1mb > 4.4mb > 6.0mb > 7.9mb > 10.mb
    # 1       2       3       4       5       6       7       8       9
    ((self.status / 9.0) ** 2 * 10485760).floor
  end
end
