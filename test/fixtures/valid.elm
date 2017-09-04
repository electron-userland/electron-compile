type Msg
    = Foo Int

initialModel : Int
initialModel = 0


update : Msg -> Int -> ( Int, Cmd Msg )
update msg data = ( data, Cmd.none )

publish : Msg -> Cmd Msg
publish msg = Cmd.none

subscriptions : Int -> Sub Msg
subscriptions int =
    Sub.batch []


main : Program Never Int Msg
main =
    Platform.program {
        init = (initialModel, Cmd.none),
        update = update,
        subscriptions = subscriptions
    }
