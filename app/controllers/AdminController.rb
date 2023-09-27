require 'json'

class AdminController < ApplicationController
  # mapped '/admin'
  configure do
    set :public_folder, "#{settings.root}/public/admin"
  end

  before do
    authenticate!(99)
  end

  # asset paths may not work correctly without the "/"
  get '' do
    redirect to('/')
  end

  get '/' do
    send_file "#{settings.root}/views/admin/index.html"
  end

  get '/client/*' do |filepath|
    send_file File.join("#{settings.root}/public/client", filepath)
  end

  post '/addUser' do
    status = params[:status].to_i
    username = params[:username]
    password = params[:password]

    if status >= 1 && status < 99 &&
      username && !username.empty? &&
      password && !password.empty?

      return "User exists." if User[username]

      user = User.new
      user.status = status
      user.username = username
      user.password = 'placeholder'
      user.create = (Time.now.to_f * 1000).to_i
      user.save

      # convert to bcrypt
      user.passwd!(password)

      'ok'
    else
      throw(:halt, [400, "Invalid fields"])
    end
  end

  QUERY_LIMIT = 100 # number of users

  post '/userStats' do
    data = []

    exclude_regex = params['exclude_users'] || ''
    include_regex = params['include_users'] || ''

    dataset = User
      .where{last_updated > 0}
      .order(Sequel.desc(:last_updated))
      .limit(100)

    exclude_regex.split(",").each do |x|
      dataset = dataset.exclude(Sequel.like(:username, x, case_insensitive: true))
    end
    include_conditions = include_regex.split(",").map do |x|
      Sequel.like(:username, x, case_insensitive: true)
    end
    dataset = dataset.where(Sequel.|(*include_conditions)) unless include_conditions.empty?

    dataset.each do |user|
      begin
        target_path = "#{settings.root}/res/storage/#{user.data_path}"

        udat = JSON.parse(File.read(target_path))

        exp = {
          settings: udat["settings"],
          comp: udat["comp"],
          last_updated: user.last_updated,
          last_visited: user.last_visited,
          quota: user.quota,
          size: File.size(target_path)
        }

        if udat["started"]
          task = udat["tasks"][udat["started"]]
          exp["started"] = task
        end

        data << { user: user.username, data: exp }
      rescue StandardError => e
        puts "An error occurred: #{user.username} #{e.message}"
      end
    end

    data.to_json
  end

end
