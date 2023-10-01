class IndexController < ApplicationController
	get '/' do
    # Temporarily redirect:
    redirect "register", 307
		# erb :index
	end

  get '/register' do
    # Temporarily redirect:
    redirect "https://docs.google.com/forms/d/e/1FAIpQLSczc8NBAMxY-9PZbda7xmbfMyiSVn6H3UEaBHoq_7BEegP9kw/viewform", 307
  end
end
