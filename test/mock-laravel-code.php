<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;

class UserController extends Controller
{
    public function report()
    {
        // Anti-pattern 1: getAll sem select (Warning)
        $users = User::all();

        // Anti-pattern 2: N+1 clássico (Error)
        foreach ($users as $user) {
            $lastOrder = Order::where('user_id', $user->id)->first();
            $user->last_order = $lastOrder;
        }

        // Anti-pattern 3: where/get sem limit (Warning)
        $activeOrders = Order::where('status', 'active')->get();

        //     // Anti-pattern 4: count() > 0 ao invés de exists() (Warning)
        //     if (Order::where('status', 'pending')->count() > 0) {
        //         return "Há pedidos pendentes";
        //     }

        //     return view('report', compact('users'));
    }

    public function reportCast()
    {
        // Anti-pattern 1: Testa all uppercase
        $order = Order::WHEREDATE('created_at', '2023-10-25')->get();

        // Anti-pattern 2: testa all lowercase
        $orders2023 = Order::whereyear('created_at', '2023')->get();

        // Anti-pattern 3: whereRaw contendo CAST manual na query
        $strOrders = Order::whereRaw('CAST(id = "1"')->first();

        // Anti-pattern 4: whereRaw com cast em letra minúscula (para testar case insensitive)
        $strOrders2 = Order::whereRaw("cast(status as string) = 'active'")->get();
    }
}
