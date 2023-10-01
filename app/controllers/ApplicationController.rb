require 'sinatra/base'
require 'sinatra/static_assets'
require 'sinatra/url_for'
require 'sqlite3'
require 'securerandom'
require 'bcrypt'
require 'mysql2'
require 'json'
require 'uri'

class ApplicationController < Sinatra::Base
  # for image_tag stylesheet_link_tag javascript_script_tag link_to link_favicon_tag
  register Sinatra::StaticAssets
  # for url_for
  helpers Sinatra::UrlForHelper

  helpers ApplicationHelper
  helpers DatabaseHelper
  helpers AssetsHelper
  helpers UrlHelper

  # set folder for templates to ../views, but make the path absolute
  set :views, File.expand_path('../../views', __FILE__)
  set :root, File.expand_path('../../', __FILE__)

  configure do
    disable :logging
    use Rack::Session::Cookie, :key => 'rack.session',
                               :path => '/',
                               :secret => SecureRandom.hex(32)

    set :erb, {layout: :'layout/main'}
    set :clean_trace, true

    set :public_folder, "#{settings.root}/public"
  end
  configure :production do
    # Set up MariaDB connection
    credentials_path = File.expand_path('../../db.credentials', __FILE__)
    credentials = JSON.parse(File.read(credentials_path))

    db_username = URI.encode_www_form_component(credentials['username'])
    db_password = URI.encode_www_form_component(credentials['password'])

    connection_str = "mysql2://#{db_username}:#{db_password}@localhost/taskcentral"
    set :database, Sequel.connect(connection_str, encoding: 'utf8')

    # set :database, Sequel.connect("sqlite://#{settings.root}/res/production.db", encoding: 'utf8')

    # Let's trade some security for performance here,
    # we're running a tiny server after all
    BCrypt::Engine::DEFAULT_COST = 6
  end
  configure :development do
    set :database, Sequel.connect("sqlite://#{settings.root}/res/development.db", encoding: 'utf8')

    BCrypt::Engine::DEFAULT_COST = 1
  end
end
