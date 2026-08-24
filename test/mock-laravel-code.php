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

        // Anti-pattern 4: count() > 0 ao invés de exists() (Warning)
        if (Order::where('status', 'pending')->count() > 0) {
            return "Há pedidos pendentes";
        }

        return view('report', compact('users'));
    }
}
