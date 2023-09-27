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
