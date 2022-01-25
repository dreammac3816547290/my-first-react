Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get 'users/index'
      post 'users/create'
      delete 'users/:id', to: 'users#destroy'
    end
  end
  root 'users#index'
end
